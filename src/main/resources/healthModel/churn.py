# -*- coding: utf-8 -*-
"""
헬스장 회원 이탈 예측 — FastAPI 백엔드 (churn service)
--------------------------------------------------------------------
역할:
    PostgreSQL(Supabase)의 h_model_data + h_survey 테이블을 조회 → 모델 피처로 매핑 →
    FastAPI 추론 엔진 실행 → Spring Boot 백엔드가 소비할 JSON 응답 반환.

실행:
    uvicorn churn:app --host 0.0.0.0 --port 8000
    또는 python churn.py

엔드포인트:
    GET /health              헬스체크
    GET /churn/{username}    회원 1명 진단 + 개선 시뮬레이션
    GET /churn               헬스장 전체 대시보드 집계
    POST /churn/batch        전체 회원 이탈 예측 배치 실행
"""
import os
import sys
import datetime
from contextlib import contextmanager
from urllib.parse import urlparse, unquote

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import joblib
import shap

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# ─────────────────── 이탈 예측 엔진 (churn_bundle.joblib) ───────────────────
try:
    _BUNDLE = joblib.load(os.path.join(HERE, "churn_bundle.joblib"))
    _CHURN_MODEL = _BUNDLE["churn_model"]
    _CALIB_MODEL = _BUNDLE.get("calib_model")
    _FEATURES = _BUNDLE["features"]  # 모델 입력 피처 순서(16개)
    _CONG_MAP = _BUNDLE.get("cong_map", {"여유": 1, "보통": 2, "혼잡": 3, "매우혼잡": 4})
    _TIER_EDGES = _BUNDLE.get("tier_edges", [25, 45, 65])
    _TIER_NAMES = _BUNDLE.get("tier_names", ["안정", "관찰", "개입", "긴급"])
    _EXPLAINER = shap.TreeExplainer(_CHURN_MODEL)
    IS_MOCK_MODEL = False
except FileNotFoundError:
    print("[경고] churn_bundle.joblib 모델 파일을 찾을 수 없습니다. 시뮬레이터용 모의 모델로 구동합니다.")
    class MockModel:
        def predict_proba(self, X):
            np.random.seed(42)
            p = np.random.uniform(0.1, 0.8, size=len(X))
            return np.column_stack([1 - p, p])

    class MockExplainer:
        def shap_values(self, X):
            np.random.seed(42)
            return np.random.normal(0, 0.2, size=(len(X), 16))

    _CHURN_MODEL = MockModel()
    _CALIB_MODEL = None
    _FEATURES = [
        "나이", "총_이용개월수", "이번달_주당방문횟수", "최근한달_일평균_운동시간", "PT_가입여부",
        "그룹수업_참여", "주_이용_시간대_혼잡도", "마지막_방문_경과일", "서비스불만_비매너회원",
        "서비스불만_환경불편", "가격불만", "기구불만_기구상태불만", "기구불만_기구부족",
        "직원불만_불친절", "직원불만_전문성부족", "최근한달_부상경험"
    ]
    _CONG_MAP = {"여유": 1, "보통": 2, "혼잡": 3, "매우혼잡": 4}
    _TIER_EDGES = [25, 45, 65]
    _TIER_NAMES = ["안정", "관찰", "개입", "긴급"]
    _EXPLAINER = MockExplainer()
    IS_MOCK_MODEL = True


# ─────────────────────────── DB 설정 ───────────────────────────
def _load_db_config():
    load_dotenv(os.path.join(HERE, ".env"))
    back_env = os.path.abspath(os.path.join(HERE, "..", "healthcareBack", ".env"))
    load_dotenv(back_env, override=False)

    user = os.getenv("DB_USER") or os.getenv("DB_USERNAME")
    password = os.getenv("DB_PASSWORD")
    url = os.getenv("DB_URL")

    if url and url.startswith("jdbc:"):
        u = urlparse(url[len("jdbc:"):])
        return {
            "host": u.hostname,
            "port": u.port or 5432,
            "dbname": (u.path or "/postgres").lstrip("/") or "postgres",
            "user": user,
            "password": password,
        }
    return {
        "host": os.getenv("DB_HOST"),
        "port": int(os.getenv("DB_PORT", "6543")),
        "dbname": os.getenv("DB_NAME", "postgres"),
        "user": user,
        "password": unquote(password) if password else None,
    }


DB = _load_db_config()
TABLE = os.getenv("MODEL_TABLE", "h_model_data")
SURVEY_TABLE = os.getenv("SURVEY_TABLE", "h_survey")


@contextmanager
def get_conn():
    conn = psycopg.connect(**DB, row_factory=dict_row)
    conn.prepare_threshold = None
    try:
        yield conn
    finally:
        conn.close()


# ─────────────────────── 데이터 매핑 및 전처리 ───────────────────────
def _norm_cong(v):
    return v.replace(" ", "") if isinstance(v, str) else v


def row_to_member(r: dict) -> dict:
    def num(v):
        return float(v) if v is not None else None

    member = {
        "나이": r.get("age"),
        "총_이용개월수": r.get("total_month"),
        "이번달_주당방문횟수": num(r.get("visit_per_week")),
        "최근한달_일평균_운동시간": num(r.get("aver_exercise")),
        "PT_가입여부": 1 if r.get("pt_yn") else 0,
        "그룹수업_참여": 1 if r.get("group_yn") else 0,
        "주_이용_시간대_혼잡도": _norm_cong(r.get("time_cong")),
        "마지막_방문_경과일": r.get("last_days"),
        "gym_id": r.get("gym_id"),
        "gym_name": r.get("gym_name"),
    }

    if r.get("survey_id") is not None:
        member.update({
            "서비스불만_비매너회원": r.get("service_rate"),
            "서비스불만_환경불편": r.get("service_rate"),
            "가격불만": r.get("cost_rate"),
            "기구불만_기구상태불만": r.get("equip_rate"),
            "기구불만_기구부족": r.get("equip_rate"),
            "직원불만_불친절": r.get("employee_rate"),
            "직원불만_전문성부족": r.get("employee_rate"),
            "최근한달_부상경험": 1 if r.get("injury_issue") else 0,
        })

    return member


def fetch_one(username: int):
    with get_conn() as conn, conn.cursor() as cur:
        query = f'''
            SELECT
                m.model_id, m.churn, m.username,
                COALESCE((
                    SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INT
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND birth_date IS NOT NULL
                    ORDER BY data_id DESC LIMIT 1
                ), m.age) AS age,
                COALESCE((
                    SELECT (EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(start_date))) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(start_date))))::INT
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND start_date IS NOT NULL
                ), m.total_month) AS total_month,
                m.visit_per_week, m.aver_exercise,
                EXISTS (
                    SELECT 1 FROM "h_contract_data"
                    WHERE receiver_id = m.username AND contract = 4
                ) AS pt_yn,
                m.group_yn, m.time_cong, m.last_days,
                COALESCE((
                    SELECT CONCAT(ROUND((end_date - signed_at::date)::NUMERIC / 30.0)::INT, '개월')
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND end_date IS NOT NULL AND signed_at IS NOT NULL
                    ORDER BY data_id DESC LIMIT 1
                ), m.contract_type) AS contract_type,
                s.survey_id, s.cost_rate, s.employee_rate, s.service_rate, s.equip_rate, s.injury_issue,
                mem.gym_id, g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, cost_rate, employee_rate, service_rate, equip_rate, injury_issue
                FROM "{SURVEY_TABLE}"
                WHERE username = m.username
                ORDER BY survey_id DESC LIMIT 1
            ) s ON TRUE
            WHERE m.username = %s
        '''
        cur.execute(query, (username,))
        return cur.fetchone()


def fetch_all():
    with get_conn() as conn, conn.cursor() as cur:
        query = f'''
            SELECT
                m.model_id, m.churn, m.username,
                COALESCE((
                    SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INT
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND birth_date IS NOT NULL
                    ORDER BY data_id DESC LIMIT 1
                ), m.age) AS age,
                COALESCE((
                    SELECT (EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(start_date))) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, MIN(start_date))))::INT
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND start_date IS NOT NULL
                ), m.total_month) AS total_month,
                m.visit_per_week, m.aver_exercise,
                EXISTS (
                    SELECT 1 FROM "h_contract_data"
                    WHERE receiver_id = m.username AND contract = 4
                ) AS pt_yn,
                m.group_yn, m.time_cong, m.last_days,
                COALESCE((
                    SELECT CONCAT(ROUND((end_date - signed_at::date)::NUMERIC / 30.0)::INT, '개월')
                    FROM "h_contract_data"
                    WHERE receiver_id = m.username AND end_date IS NOT NULL AND signed_at IS NOT NULL
                    ORDER BY data_id DESC LIMIT 1
                ), m.contract_type) AS contract_type,
                s.survey_id, s.cost_rate, s.employee_rate, s.service_rate, s.equip_rate, s.injury_issue,
                mem.gym_id, g.gym_name
            FROM "{TABLE}" m
            LEFT JOIN "h_member" mem ON m.username = mem.username
            LEFT JOIN "h_gym" g ON mem.gym_id = g.gym_id
            LEFT JOIN LATERAL (
                SELECT survey_id, cost_rate, employee_rate, service_rate, equip_rate, injury_issue
                FROM "{SURVEY_TABLE}"
                WHERE username = m.username
                ORDER BY survey_id DESC LIMIT 1
            ) s ON TRUE
            WHERE mem.role = 'member'
              AND EXISTS (SELECT 1 FROM "h_check_inout" c WHERE c.username = m.username)
        '''
        cur.execute(query)
        return cur.fetchall()


def fetch_recent_inouts(username: int = None) -> list:
    with get_conn() as conn, conn.cursor() as cur:
        if username is not None:
            query = '''
                SELECT username, check_in, duration 
                FROM "h_check_inout"
                WHERE username = %s AND check_in >= CURRENT_DATE - INTERVAL '30 days'
            '''
            cur.execute(query, (username,))
        else:
            query = '''
                SELECT username, check_in, duration 
                FROM "h_check_inout"
                WHERE check_in >= CURRENT_DATE - INTERVAL '30 days'
            '''
            cur.execute(query)
        return cur.fetchall()


def calculate_all_visit_per_week_pandas(inouts_list: list) -> dict:
    if not inouts_list:
        return {}
    df = pd.DataFrame(inouts_list)
    df['date'] = pd.to_datetime(df['check_in']).dt.date
    grouped = df.groupby('username')['date'].nunique()
    return (grouped / 4.2857).round(2).to_dict()


def calculate_all_aver_exercise_pandas(inouts_list: list) -> dict:
    if not inouts_list:
        return {}
    df = pd.DataFrame(inouts_list)
    df['duration'] = df['duration'].fillna(0)
    return df.groupby('username')['duration'].mean().to_dict()


def fetch_all_last_check_in_dates() -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            SELECT username, MAX(check_in) AS max_check_in
            FROM "h_check_inout"
            GROUP BY username
        '''
        cur.execute(query)
        return {row.get("username"): row.get("max_check_in").date() for row in cur.fetchall() if row.get("max_check_in")}


def calculate_all_last_days() -> dict:
    today = datetime.date.today()
    last_dates = fetch_all_last_check_in_dates()
    return {username: (today - dt).days for username, dt in last_dates.items()}


def update_time_congestion_statistics(days: int = 30):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('SELECT gym_id, COUNT(*) AS member_count FROM "h_member" GROUP BY gym_id')
        gym_members = {row['gym_id']: row['member_count'] for row in cur.fetchall()}

        cur.execute('''
            SELECT gym_id, SUM(item_count) * 1.7 AS capacity
            FROM "h_item" WHERE item_category = '기구' GROUP BY gym_id
        ''')
        gym_capacity = {row['gym_id']: float(row['capacity']) for row in cur.fetchall() if row['capacity']}

        cur.execute('''
            SELECT gym_id, COUNT(DISTINCT check_in::date) AS open_days
            FROM "h_check_inout"
            WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
            GROUP BY gym_id
        ''', (days,))
        gym_open_days = {row['gym_id']: row['open_days'] for row in cur.fetchall()}

        cur.execute('''
            SELECT gym_id, hour, COUNT(*) AS total_present
            FROM (
                SELECT ci.gym_id, EXTRACT(HOUR FROM m)::INT AS hour
                FROM "h_check_inout" ci
                CROSS JOIN LATERAL generate_series(
                        date_trunc('hour', ci.check_in),
                        ci.check_in + make_interval(mins => COALESCE(ci.duration, 0)::int),
                        interval '1 hour') AS m
                WHERE ci.check_in >= CURRENT_DATE - make_interval(days => %s)
                  AND m >= ci.check_in
                  AND m <  ci.check_in + make_interval(mins => COALESCE(ci.duration, 0)::int)
            ) p
            GROUP BY gym_id, hour
        ''', (days,))
        rows = cur.fetchall()
        if not rows:
            return

        active_gyms = list({row['gym_id'] for row in rows})
        cur.execute('DELETE FROM "h_time_congestion" WHERE gym_id = ANY(%s)', (active_gyms,))

        for row in rows:
            gym_id = row['gym_id']
            hour = row['hour']
            total_present = row['total_present']
            open_days = gym_open_days.get(gym_id) or 1
            daily_avg = total_present / open_days

            max_capacity = gym_capacity.get(gym_id)
            if not max_capacity or max_capacity <= 0:
                max_capacity = gym_members.get(gym_id, 0) * 0.1
            if max_capacity <= 0:
                max_capacity = 1.0

            occupancy_rate = (daily_avg / max_capacity) * 100.0

            if occupancy_rate < 50.0:
                level = '여유'
            elif occupancy_rate < 70.0:
                level = '보통'
            elif occupancy_rate < 90.0:
                level = '혼잡'
            else:
                level = '매우 혼잡'

            cur.execute('''
                INSERT INTO "h_time_congestion" (gym_id, hour, visit_count, congestion_level)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (gym_id, hour)
                DO UPDATE SET
                    visit_count = EXCLUDED.visit_count,
                    congestion_level = EXCLUDED.congestion_level
            ''', (gym_id, hour, int(round(daily_avg)), level))
        conn.commit()


def get_members_time_congestion(days: int = 30) -> dict:
    result_map = {}
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            WITH member_hour_visits AS (
                SELECT
                    username, gym_id,
                    EXTRACT(HOUR FROM check_in)::INT AS visit_hour,
                    COUNT(*) AS count,
                    ROW_NUMBER() OVER (PARTITION BY username ORDER BY COUNT(*) DESC, EXTRACT(HOUR FROM check_in)::INT ASC) as rn
                FROM "h_check_inout"
                WHERE check_in >= CURRENT_DATE - make_interval(days => %s)
                GROUP BY username, gym_id, EXTRACT(HOUR FROM check_in)::INT
            )
            SELECT
                mh.username,
                COALESCE(tc.congestion_level, '보통') AS congestion_level
            FROM member_hour_visits mh
            LEFT JOIN "h_time_congestion" tc ON mh.gym_id = tc.gym_id AND mh.visit_hour = tc.hour
            WHERE mh.rn = 1
        '''
        cur.execute(query, (days,))
        for row in cur.fetchall():
            result_map[row['username']] = _norm_cong(row['congestion_level'])
    return result_map


# ─────────────────────────── FastAPI 설정 ───────────────────────────
app = FastAPI(title="Churn Prediction API", version="0.1.0")

_origins = [o for o in (os.getenv("FRONTEND_SERVER_URL"), os.getenv("BACKEND_SERVER_URL")) if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "table": TABLE, "survey_table": SURVEY_TABLE}


# ─────────────────── 이탈 예측 (벡터화 · 등급 · SHAP 요인) ───────────────────
def _tier(score):
    for edge, name in zip(_TIER_EDGES, _TIER_NAMES):
        if score < edge:
            return name
    return _TIER_NAMES[-1]


def _vectorize(member: dict) -> np.ndarray:
    vals = []
    for f in _FEATURES:
        if f == "상대_방문공백":
            rel = member.get("상대_방문공백")
            if rel is None:
                last = member.get("마지막_방문_경과일")
                vpw = member.get("이번달_주당방문횟수")
                if last is None:
                    rel = np.nan
                elif vpw:
                    rel = float(last) * float(vpw) / 7.0
                else:
                    rel = float(last) / 7.0
            vals.append(float(rel) if rel is not None else np.nan)
        elif f == "주_이용_시간대_혼잡도":
            v = _norm_cong(member.get(f))
            vals.append(float(_CONG_MAP[v]) if v in _CONG_MAP else np.nan)
        else:
            v = member.get(f)
            vals.append(float(v) if v is not None else np.nan)
    return np.array(vals, dtype=float)


def _predict_batch(members):
    X = np.vstack([_vectorize(m) for m in members])
    proba = (_CALIB_MODEL.predict_proba(X) if _CALIB_MODEL is not None
             else _CHURN_MODEL.predict_proba(X))
    probs = proba[:, 1]
    sv = np.asarray(_EXPLAINER.shap_values(X))
    if sv.ndim == 3:
        sv = sv[-1]
    out = []
    for i in range(len(members)):
        score = float(probs[i]) * 100.0
        order = np.argsort(-sv[i])
        tops = [_FEATURES[j] for j in order if sv[i][j] > 0][:3]
        out.append((float(probs[i]), _tier(score), tops))
    return out


# ─────────────────────── 개별 회원 진단 및 전체 대시보드 ───────────────────────
@app.get("/churn/{username}")
def get_user_churn(username: int):
    """회원 1명의 이탈 예측 + 위험 등급 + 주요 요인 진단"""
    row = fetch_one(username)
    if not row:
        raise HTTPException(status_code=404, detail="회원 정보를 찾을 수 없습니다.")

    inouts = fetch_recent_inouts(username)
    vpw_dict = calculate_all_visit_per_week_pandas(inouts)
    avex_dict = calculate_all_aver_exercise_pandas(inouts)
    
    m = row_to_member(row)
    m["이번달_주당방문횟수"] = vpw_dict.get(username, 0.0)
    m["최근한달_일평균_운동시간"] = avex_dict.get(username, 0.0)
    
    today = datetime.date.today()
    last_check_in = fetch_all_last_check_in_dates().get(username)
    m["마지막_방문_경과일"] = (today - last_check_in).days if last_check_in else 999

    preds = _predict_batch([m])
    churn_rate, tier_name, top_reasons = preds[0]

    return {
        "username": username,
        "churn_rate": round(churn_rate * 100, 2),
        "risk_tier": tier_name,
        "top_reasons": top_reasons,
        "features": m
    }


@app.get("/churn")
def get_churn_dashboard():
    """전체 회원 이탈 집계 대시보드 데이터 반환"""
    with get_conn() as conn, conn.cursor() as cur:
        query = '''
            SELECT 
                r.username, r.churn_rate, r.top1_reason, r.top2_reason, r.top3_reason,
                m.gym_id, g.gym_name
            FROM "h_churn_result" r
            LEFT JOIN "h_member" m ON r.username = m.username
            LEFT JOIN "h_gym" g ON m.gym_id = g.gym_id
            WHERE r.churn_date = CURRENT_DATE
        '''
        cur.execute(query)
        results = cur.fetchall()

    if not results:
        return {"total_members": 0, "risk_members": 0, "gym_summary": []}

    total_count = len(results)
    risk_count = sum(1 for r in results if r["churn_rate"] >= 0.45)

    return {
        "total_members": total_count,
        "risk_members": risk_count,
        "results": results
    }


# ─────────────────────── 배치 처리 엔드포인트 ───────────────────────
def analyze_and_save_all(days: int = 30, chunk_size: int = 1000) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            INSERT INTO "h_model_data" (username)
            SELECT DISTINCT c.username FROM "h_check_inout" c
            WHERE NOT EXISTS (SELECT 1 FROM "h_model_data" m WHERE m.username = c.username)
              AND EXISTS (SELECT 1 FROM "h_member" mem WHERE mem.username = c.username AND mem.role = 'member')
        ''')
        inserted = cur.rowcount
        cur.execute('''
            UPDATE "h_model_data" m SET churn = (mem.status = '이탈')
            FROM "h_member" mem WHERE m.username = mem.username AND mem.status IN ('이용중', '이탈')
        ''')
        conn.commit()

    rows = fetch_all()
    excluded_churned = sum(1 for r in rows if r.get("churn"))
    rows = [r for r in rows if not r.get("churn")]
    if not rows:
        return {"신규등록": inserted, "이탈제외": excluded_churned, "처리": 0, "회원수": 0, "메시지": "예측 대상 없음"}

    update_time_congestion_statistics(days)
    congestion_map = get_members_time_congestion(days)
    inouts = fetch_recent_inouts()
    visits_map = calculate_all_visit_per_week_pandas(inouts)
    exercise_map = calculate_all_aver_exercise_pandas(inouts)
    last_days_map = calculate_all_last_days()

    insert_sql = '''
        INSERT INTO "h_churn_result" (username, churn_rate, top1_reason, top2_reason, top3_reason, churn_date)
        VALUES (%s, %s, %s, %s, %s, CURRENT_DATE)
    '''
    feature_sql = '''
        UPDATE "h_model_data" SET age=%s, total_month=%s, visit_per_week=%s, aver_exercise=%s,
            pt_yn=%s, time_cong=%s, last_days=%s, contract_type=%s WHERE model_id=%s
    '''

    total = 0
    risk_count = 0
    gyms_seen = set()
    RISK_TIERS = {"개입", "긴급"}

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM "h_churn_result" WHERE churn_date = CURRENT_DATE')
        conn.commit()

        for start in range(0, len(rows), chunk_size):
            chunk = rows[start:start + chunk_size]
            members, metas = [], []
            for r in chunk:
                uname = r["username"]
                vpw = visits_map.get(uname, 0.0)
                avex = exercise_map.get(uname, 0.0)
                ldays = last_days_map.get(uname, 999)
                tcong = congestion_map.get(uname, "보통")
                
                m = row_to_member(r)
                m["이번달_주당방문횟수"] = vpw
                m["최근한달_일평균_운동시간"] = avex
                m["마지막_방문_경과일"] = ldays
                m["주_이용_시간대_혼잡도"] = tcong
                
                members.append(m)
                metas.append((r, vpw, avex, ldays, tcong))

            preds = _predict_batch(members)
            result_records, feature_records = [], []
            for (r, vpw, avex, ldays, tcong), (churn_rate, tier, tops) in zip(metas, preds):
                t = [tops[k] if k < len(tops) else None for k in range(3)]
                result_records.append((r["username"], churn_rate, t[0], t[1], t[2]))
                feature_records.append((r["age"], r["total_month"], vpw, avex,
                                        r["pt_yn"], tcong, ldays, r["contract_type"], r["model_id"]))
                if tier in RISK_TIERS:
                    risk_count += 1
                gid = r.get("gym_id")
                if gid is not None:
                    gyms_seen.add(gid)

            cur.executemany(feature_sql, feature_records)
            cur.executemany(insert_sql, result_records)
            conn.commit()
            total += len(result_records)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('''
            DELETE FROM "h_churn_result" WHERE username IN (
                SELECT m.username FROM "h_model_data" m
                WHERE NOT EXISTS (SELECT 1 FROM "h_check_inout" c WHERE c.username = m.username))
        ''')
        deleted = cur.rowcount
        conn.commit()

    return {"신규등록": inserted, "이탈제외": excluded_churned, "처리": total, "회원수": len(rows),
            "정리삭제": deleted, "gym수": len(gyms_seen), "위험군수": risk_count}


@app.post("/churn/batch")
def churn_batch():
    """전체 회원 이탈 예측 결과를 h_churn_result 에 일괄 갱신 (스케줄러/수동 트리거용)."""
    return analyze_and_save_all()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("churn:app", host="0.0.0.0", port=8000, reload=False)
    
    
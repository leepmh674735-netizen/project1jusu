# -*- coding: utf-8 -*-
"""하루 1회 실행용 배치 — 전체 회원 이탈 예측 결과(h_churn_result) 갱신.

스케줄러(Windows 작업 스케줄러 / cron)에서 이 스크립트를 실행한다.
    <venv>/python run_daily_batch.py

FastAPI 서버가 떠 있지 않아도 독립적으로 동작한다(DB에 직접 계산·기입).
"""
import os
import sys
import datetime
import traceback

# 현재 스크립트 위치를 파이썬 경로 최상단에 추가
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import churn


def main():
    started = datetime.datetime.now()
    print(f"[{started:%Y-%m-%d %H:%M:%S}] 이탈 예측 배치 시작")
    sys.stdout.flush()

    try:
        # churn.py 내부의 전체 회원 분석 및 DB 저장 로직 수행
        result = churn.analyze_and_save_all()
        print(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] [성공] 배치 결과: {result}")
        sys.exit_code = 0
    except Exception as e:
        print(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] [에러] 배치 실패: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit_code = 1
    finally:
        elapsed = (datetime.datetime.now() - started).total_seconds()
        print(f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] 총 소요 시간: {elapsed:.1f}s")
        sys.stdout.flush()

    # 스케줄러 상태 감지용 종료 코드 반환
    sys.exit(sys.exit_code)


if __name__ == "__main__":
    main()
    
    
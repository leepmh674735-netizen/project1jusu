import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티
import './Dashboard.css';

// 위젯 키별 표시 이름
const WIDGET_LABEL = {
  gymCount: '계약 체육관 수',
  expiringSubscription: '다가오는 구독 만료',
  monthlyRevenue: '월별 총 매출',
  monthlyExpense: '월별 총 지출',
  gymNps: '체육관 만족도',
  gymChurn: '헬스장 이탈율',
  managedMemberCount: '담당 회원 수',
  lowSessionMembers: '세션 소진 임박',
  monthlySession: '월별 세션 수행',
  memberChurn: '회원 이탈 예측',
  goalRate: '목표 달성률',
  activeMemberCount: '총 회원 수',
  couponUsage: '쿠폰 사용',
  expiringMemberCount: '만료 임박 회원 수',
  todayAttendance: '오늘 출석',
  churnTrend: '월별 이탈 위험군 추이',
};

const WIDGET_LAYOUT = {
  gymCount: 'kpi',
  managedMemberCount: 'kpi',
  gymNps: 'kpi',
  memberChurn: 'kpi',
  gymChurn: 'kpi',
  goalRate: 'kpi',
  monthlyRevenue: 'chart',
  monthlyExpense: 'chart',
  monthlySession: 'chart',
  activeMemberCount: 'kpi',
  couponUsage: 'kpi',
  expiringMemberCount: 'kpi',
  todayAttendance: 'kpi',
  churnTrend: 'chart',
};

const layoutOf = (widgetKey) => WIDGET_LAYOUT[widgetKey] ?? 'list';

const CHART_SERIES = {
  monthlyRevenue: { label: '매출', tone: 'accent' },
  monthlyExpense: { label: '지출', tone: 'gray' },
  monthlySession: { label: '세션', tone: 'accent' },
  churnTrend: { label: '위험군', tone: 'blue' },
};

const MANAGEMENT_ROUTE = '/fitb/management';
const REPORT_ROUTE = '/fitb/report';

const WIDGET_LINK = {
  activeMemberCount: MANAGEMENT_ROUTE,
  todayAttendance: MANAGEMENT_ROUTE,
  monthlyRevenue: '/fitb/Settlepage',
  monthlyExpense: '/fitb/Settlepage',
  gymChurn: REPORT_ROUTE,
};

const AI_QUESTIONS = [
  { key: 'netprofit', tag: '매출 × 지출', question: '최근 6개월 순이익 추이 알려줘' },
  { key: 'renewal', tag: '계약', question: 'PT 계약 갱신율은 어때?' },
  { key: 'unpaid', tag: '결제', question: '미결제 회원 알려줘' },
  { key: 'churn', tag: '이탈 예측', question: '이탈 위험이 높은 회원은 누구야?' },
];

function WidgetEditModal({ widgets, onToggle, onMove, onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const onBackdropClick = (e) => {
    if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
  };

  return (
    <div className="dash-modal-back" onClick={onBackdropClick}>
      <div className="dash-modal" ref={boxRef} role="dialog" aria-modal="true" aria-label="위젯 편집">
        <div className="dash-modal__head">
          <h4 className="dash-modal__title">위젯 편집</h4>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <p className="dash-modal__desc">대시보드에 표시할 위젯을 켜고 끌 수 있어요</p>

        <ul className="dash-modal__list">
          {widgets.map((widget) => (
            <li key={widget.widgetKey} className={widget.hasData ? '' : 'locked'}>
              <label>
                <input
                  type="checkbox"
                  checked={widget.isActive}
                  disabled={!widget.hasData}
                  onChange={() => onToggle(widget)}
                />
                {WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey}
              </label>
              {widget.hasData ? (
                <span className="dash-modal__order">
                  <button type="button" onClick={() => onMove(widget.widgetKey, -1)} aria-label="위로">▲</button>
                  <button type="button" onClick={() => onMove(widget.widgetKey, 1)} aria-label="아래로">▼</button>
                </span>
              ) : (
                <span className="dash-badge">데이터 없음</span>
              )}
            </li>
          ))}
        </ul>

        <p className="dash-modal__hint">데이터가 없는 위젯은 켤 수 없어요. 데이터가 쌓이면 켤 수 있어요.</p>
        <div className="dash-modal__actions">
          <button type="button" className="dash-modal__done" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState([]);
  const [data, setData] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [briefing, setBriefing] = useState(null);
  const [bundleOpen, setBundleOpen] = useState(false);

  const abortControllerRef = useRef(null);

  const getLoginUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };

  const loginUser = getLoginUser();
  const token = localStorage.getItem('accessToken');
  const aiEligible = ['owner', 'admin', 'trainer']
    .includes(String(loginUser?.role || '').toLowerCase());

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 위젯 설정 + 활성 위젯 데이터 조회 (fetchWithToken 연동)
  const loadDashboard = useCallback(async () => {
    if (!token) return;

    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const [widgetRes, dataRes] = await Promise.all([
        fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets`, { signal: controller.signal }),
        fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/dashboard/data`, { signal: controller.signal }),
      ]);

      if (widgetRes.ok && dataRes.ok) {
        setWidgets(await widgetRes.json());
        setData(await dataRes.json());
        setMessage('');
      } else {
        setMessage(`조회 실패(${widgetRes.status}): ${await widgetRes.text()}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('대시보드 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
    return () => cancelPendingRequests();
  }, [loadDashboard]);

  // AI 태스크 브리핑 조회 (fetchWithToken 연동)
  useEffect(() => {
    if (!token || !aiEligible) return;

    const controller = new AbortController();
    fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/ai/briefing`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => setBriefing(result ? result.items ?? [] : []))
      .catch((err) => {
        if (err.name !== 'AbortError') setBriefing([]);
      });

    return () => controller.abort();
  }, [token, aiEligible]);

  const askAi = (question) => {
    window.dispatchEvent(new CustomEvent('ai-ask', { detail: question }));
  };

  const handleToggle = async (widget) => {
    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ widgetKey: widget.widgetKey, isActive: !widget.isActive }),
      });

      if (response.ok) {
        loadDashboard();
      } else {
        setMessage(await response.text());
      }
    } catch (error) {
      console.error('위젯 토글 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const visibleWidgets = widgets.filter((w) => WIDGET_LABEL[w.widgetKey]);
  const activeWidgets = visibleWidgets.filter((w) => w.isActive && w.hasData);

  const handleMove = async (widgetKey, direction) => {
    const index = visibleWidgets.findIndex((w) => w.widgetKey === widgetKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visibleWidgets.length) return;

    const reordered = [
      { widgetKey: visibleWidgets[index].widgetKey, sortOrder: visibleWidgets[target].sortOrder },
      { widgetKey: visibleWidgets[target].widgetKey, sortOrder: visibleWidgets[index].sortOrder },
    ];

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets/order`, {
        method: 'PUT',
        body: JSON.stringify(reordered),
      });

      if (response.ok) {
        loadDashboard();
      } else {
        setMessage(`순서 변경 실패(${response.status})`);
      }
    } catch (error) {
      console.error('위젯 순서 변경 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const renderWidgetData = (widgetKey) => {
    const value = data[widgetKey];
    if (value == null) return <p className="dash-empty">데이터 없음</p>;

    switch (widgetKey) {
      case 'gymCount':
      case 'managedMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total ?? 0}<span> 명(개)</span></p>
            <p className="dash-sub">이번 달 신규 +{value.newThisMonth ?? 0}</p>
          </div>
        );
      case 'activeMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total ?? 0}<span> 명</span></p>
            <p className="dash-sub">이번 달 신규 +{value.newThisMonth ?? 0}</p>
            <p className="dash-sub">이용권 {value.membership ?? 0} · PT {value.pt ?? 0} · 체험 {value.trial ?? 0}</p>
          </div>
        );
      case 'couponUsage': {
        const total = value.total || 0;
        const used = value.used || 0;
        const pct = total > 0 ? Math.round((used / total) * 100) : 0;
        return (
          <div>
            <p className="dash-kpi">{used}<span> / {total}건 사용</span></p>
            <div className="dash-progress">
              <div className="dash-progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="dash-sub">사용률 {pct}%</p>
          </div>
        );
      }
      case 'expiringMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total ?? 0}<span> 명</span></p>
            <p className="dash-sub">30일 내 만료 예정</p>
          </div>
        );
      case 'todayAttendance':
        return (
          <div>
            <p className="dash-kpi">{value.total ?? 0}<span> 명</span></p>
            <p className="dash-sub">오늘 출석 인원</p>
          </div>
        );
      case 'expiringSubscription':
        return (
          <ul className="dash-list">
            {Array.isArray(value) && value.map((row, i) => (
              <li key={i}>
                <span>{row.name}</span>
                <span className={row.dday <= 7 ? 'dash-badge danger' : 'dash-badge'}>D-{row.dday}</span>
              </li>
            ))}
          </ul>
        );
      case 'monthlyRevenue':
      case 'monthlyExpense':
      case 'monthlySession': {
        const list = Array.isArray(value) ? value : [];
        const max = Math.max(...list.map((row) => Number(row.total))) || 1;
        const tone = CHART_SERIES[widgetKey]?.tone ?? 'accent';
        return (
          <div className="dash-chart">
            {list.map((row) => (
              <div key={row.month} className="dash-bar-col" title={`${row.month} · ${Number(row.total).toLocaleString()}`}>
                <div
                  className={`dash-bar dash-bar--${tone}`}
                  style={{ height: `${Math.max(3, Math.round((Number(row.total) / max) * 100))}%` }}
                />
                <span className="dash-bar-month">{String(row.month).slice(5)}월</span>
              </div>
            ))}
          </div>
        );
      }
      case 'lowSessionMembers':
        return (
          <ul className="dash-list">
            {Array.isArray(value) && value.map((row, i) => (
              <li key={i}>
                <span>{row.name}</span>
                <span className={row.remain <= 3 ? 'dash-badge danger' : 'dash-badge'}>{row.remain}회 남음</span>
              </li>
            ))}
          </ul>
        );
      case 'gymNps':
        return (
          <div>
            <p className="dash-kpi">{value.averageScore ?? 0}<span> / 5점</span></p>
            <p className="dash-sub">설문 {value.total ?? 0}건 기준</p>
          </div>
        );
      case 'churnTrend': {
        const list = Array.isArray(value) ? value : [];
        const max = Math.max(...list.map((row) => Number(row.riskMembers))) || 1;
        return (
          <div className="dash-chart">
            {list.map((row) => (
              <div
                key={row.period}
                className="dash-bar-col"
                title={`${row.period} · 위험군 ${row.riskMembers}명 · 평균 이탈률 ${(Number(row.avgChurnRate || 0) * 100).toFixed(1)}%`}
              >
                <div
                  className="dash-bar dash-bar--blue"
                  style={{ height: `${Math.max(3, Math.round((Number(row.riskMembers) / max) * 100))}%` }}
                />
                <span className="dash-bar-month">{String(row.period).slice(5)}월</span>
              </div>
            ))}
          </div>
        );
      }
      case 'memberChurn':
      case 'gymChurn':
        return (
          <div>
            <p className="dash-kpi">{value.highRiskCount ?? 0}<span> 명 고위험</span></p>
            <p className="dash-sub">평균 이탈률 {(Number(value.averageChurnRate || 0) * 100).toFixed(1)}% · {value.total ?? 0}명 분석</p>
          </div>
        );
      default:
        return <pre className="dash-sub">{JSON.stringify(value)}</pre>;
    }
  };

  return (
    <div className="dash-page">
      <div className="dash-toolbar">
        <div className="dash-chips">
          {activeWidgets.map((widget) => (
            <span key={widget.widgetKey} className="dash-chip">
              {WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey}
              <button
                type="button"
                className="dash-chip__remove"
                title={`${WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey} 숨기기`}
                onClick={() => handleToggle(widget)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <button type="button" className="dash-edit-btn" onClick={() => setEditOpen(!editOpen)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
          </svg>
          위젯 편집
        </button>
      </div>

      {!token && <p className="dash-message">로그인이 필요합니다. 먼저 로그인해 주세요.</p>}
      {message && <p className="dash-message">{message}</p>}

      {editOpen && (
        <WidgetEditModal
          widgets={visibleWidgets}
          onToggle={handleToggle}
          onMove={handleMove}
          onClose={() => setEditOpen(false)}
        />
      )}

      <div className="dash-grid">
        {activeWidgets.length === 0 && <p className="dash-empty">표시할 위젯이 없습니다. 위젯 편집에서 켜보세요.</p>}
        {activeWidgets.map((widget) => {
          const layout = layoutOf(widget.widgetKey);
          const series = CHART_SERIES[widget.widgetKey];
          const linkTo = WIDGET_LINK[widget.widgetKey];
          const clickable = !!linkTo && !editOpen;
          const CardTag = clickable ? 'button' : 'div';
          const cardProps = clickable
            ? { type: 'button', onClick: () => navigate(linkTo), className: `dash-card dash-card--${layout} dash-card--clickable` }
            : { className: `dash-card dash-card--${layout}` };
          return (
            <CardTag key={widget.widgetKey} {...cardProps}>
              <div className="dash-card__head">
                <h2>{WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey}</h2>
                {series && (
                  <span className={`dash-legend dash-legend--${series.tone}`}>● {series.label}</span>
                )}
              </div>
              {renderWidgetData(widget.widgetKey)}
            </CardTag>
          );
        })}
      </div>

      {aiEligible && (
        <div className="dash-ai-zone">
          <div className="dash-ai-card">
            <h3>AI 비서에게 물어보기</h3>
            <div className="dash-ai-questions">
              {AI_QUESTIONS.map((q) => (
                <button key={q.key} type="button" className="dash-ai-question" onClick={() => askAi(q.question)}>
                  <span className="dash-ai-tag">{q.tag}</span>
                  {q.question}
                </button>
              ))}
            </div>
            <p className="dash-ai-caption">누르면 AI가 팝업으로 답해드려요</p>
          </div>

          <div className="dash-ai-card">
            <h3>오늘 처리할 일</h3>
            {briefing == null && <p className="dash-sub">불러오는 중...</p>}
            {briefing != null && briefing.length === 0 && (
              <p className="dash-sub">오늘 처리할 일이 없어요</p>
            )}
            {briefing != null && briefing.length > 0 && (
              <div className="dash-ai-tasks">
                {briefing.map((item) => (
                  item.bundle ? (
                    <div key={item.key}>
                      <button type="button" className="dash-ai-task" onClick={() => setBundleOpen(!bundleOpen)}>
                        <span className="dash-ai-task-label">{item.label}</span>
                        <span className="dash-badge warning">{item.count}건</span>
                        <span className="dash-ai-task-go">{bundleOpen ? '▴' : '▾'}</span>
                      </button>
                      {bundleOpen && item.bundle.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className="dash-ai-task dash-ai-task-sub"
                          onClick={() => navigate(sub.linkTo)}
                        >
                          <span className="dash-ai-task-label">{sub.label}</span>
                          <span className="dash-badge warning">{sub.count}건</span>
                          <span className="dash-ai-task-go">→</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      className="dash-ai-task"
                      onClick={() => navigate(item.linkTo)}
                    >
                      <span className="dash-ai-task-label">{item.label}</span>
                      <span className={`dash-badge ${item.tone === 'danger' ? 'danger' : 'warning'}`}>
                        {item.count}건
                      </span>
                      <span className="dash-ai-task-go">→</span>
                    </button>
                  )
                ))}
              </div>
            )}
            <p className="dash-ai-caption">누르면 해당 페이지로 이동해요</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiChat from '../ai/AiChat.jsx';
import { FactorDetailLoader, RiskMembersPanel } from '../report/Report.jsx';
import NavIcon from './uiIcons.jsx';
import { fetchWithToken } from '../utils/fetchWithToken.js'; // 공통 fetch 래퍼 유틸리티
import './B2bDrawer.css';

const CONTRACT_LABEL = { 1: '제휴', 2: '임금', 3: '이용권', 4: 'PT', 5: 'PT 체험' };

// 상태 pill 배지 톤
const STATUS_BADGE = {
  ACTIVE: 'b2b-drawer__badge--active',
  SIGNED: 'b2b-drawer__badge--signed',
  ISSUED: 'b2b-drawer__badge--issued',
  TERMINATED: 'b2b-drawer__badge--terminated',
};

// 값 포맷터
const won = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
const fmtId = (value) => `#${value}`;
const fmtWon = (value) => won(value);
const fmtDiscount = (value) => (value > 0 ? `−${won(value)}` : null);
const fmtInstallment = (value) => (Number(value) === 0 ? '일시불' : `${value}개월 할부`);
const fmtRate = (value) => (Number(value) > 0 ? `${(Number(value) * 100).toFixed(0)}%` : null);

// kind별 표시 필드 메타
const DATA_FIELDS = {
  settle: {
    fields: [
      { key: 'payId', label: '결제 ID', format: fmtId },
      { key: 'dataId', label: '계약 ID', format: fmtId },
      { key: 'username', label: '회원 연락처' },
      { key: 'payName', label: '결제 항목' },
      { key: 'payPrice', label: '결제 금액', format: fmtWon, tone: 'strong' },
      { key: 'couponName', label: '사용 쿠폰' },
      { key: 'discountAmount', label: '할인 금액', format: fmtDiscount, tone: 'danger' },
      { key: 'installment', label: '결제 방법', format: fmtInstallment },
      { key: 'payDate', label: '결제일', tone: 'num' },
    ],
    hidden: ['gymId', 'couponId'],
  },
  expense: {
    fields: [
      { key: 'expenseId', label: '지출 ID', format: fmtId },
      { key: 'expenseName', label: '지출 항목' },
      { key: 'expensePrice', label: '지출 금액', format: fmtWon, tone: 'danger' },
      { key: 'expenseDate', label: '결제일', tone: 'num' },
      { key: 'expenseRate', label: '수수료·인센 비율', format: fmtRate },
      { key: 'dataId', label: '계약 ID', format: fmtId },
      { key: 'settlementId', label: '커미션 정산 ID', format: fmtId },
      { key: 'originItemId', label: '물품 등록 ID', format: fmtId },
    ],
    hidden: ['gymId'],
  },
  item: {
    fields: [
      { key: 'itemId', label: '물품 ID', format: fmtId },
      { key: 'itemCategory', label: '분류' },
      { key: 'itemName', label: '물품명' },
      { key: 'itemCount', label: '수량' },
      { key: 'itemPrice', label: '금액', format: fmtWon, tone: 'strong' },
      { key: 'itemDate', label: '등록일', tone: 'num' },
      { key: 'itemStatus', label: '상태' },
      { key: 'itemExpiryDate', label: '유효기간', tone: 'num' },
    ],
    hidden: ['gymId'],
  },
};

const buildRows = (kind, data) => {
  const source = data || {};
  const meta = DATA_FIELDS[kind] ?? { fields: [], hidden: [] };
  const rows = [];

  meta.fields.forEach(({ key, label, format, tone }) => {
    const value = source[key];
    if (value === null || value === undefined || value === '') return;
    const text = format ? format(value) : String(value);
    if (text === null || text === undefined) return;
    rows.push({ key, label, text, tone });
  });

  const known = new Set([...meta.fields.map((f) => f.key), ...meta.hidden]);
  Object.entries(source).forEach(([key, value]) => {
    if (known.has(key)) return;
    if (value === null || value === undefined || typeof value === 'object') return;
    rows.push({ key, label: key, text: String(value) });
  });

  return rows;
};

const DEFAULT_WIDTH = 440;
const MIN_WIDTH = 360;
const LNB_WIDTH = 248;

const getMaxWidth = () => Math.min(1080, window.innerWidth - LNB_WIDTH - 48);
const clampWidth = (w) => Math.max(MIN_WIDTH, Math.min(getMaxWidth(), w));

// kind='contract' 탭 본문 (fetchWithToken 적용)
function ContractTabContent({ id, onOpenPage }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setDetail(null);
      setError('');
      try {
        const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${id}`);
        if (!response.ok) {
          if (!ignore) setError(`상세를 불러올 수 없습니다 (${response.status})`);
          return;
        }
        const data = await response.json();
        if (!ignore) setDetail(data);
      } catch {
        if (!ignore) setError('상세를 불러올 수 없습니다 (통신 오류)');
      }
    };
    load();
    return () => { ignore = true; };
  }, [id]);

  const amountText = detail
    ? (detail.contract === 1
      ? (detail.contractRate != null ? `${detail.contractRate}%` : '-')
      : (detail.amount != null ? `${detail.amount}만원` : '-'))
    : '';

  return (
    <>
      <div className="b2b-drawer__fields">
        {error ? (
          <p className="b2b-drawer__message">{error}</p>
        ) : !detail ? (
          <p className="b2b-drawer__message">불러오는 중...</p>
        ) : (
          <dl className="b2b-drawer__list">
            <div className="b2b-drawer__row"><dt>계약 ID</dt><dd>#{detail.dataId}</dd></div>
            <div className="b2b-drawer__row"><dt>계약 유형</dt><dd>{CONTRACT_LABEL[detail.contract] ?? detail.contract}</dd></div>
            <div className="b2b-drawer__row"><dt>이름</dt><dd>{detail.member?.name ?? detail.receiverName ?? '-'}</dd></div>
            <div className="b2b-drawer__row">
              <dt>상태</dt>
              <dd>
                <span className={`b2b-drawer__badge ${STATUS_BADGE[detail.status] ?? 'b2b-drawer__badge--issued'}`}>
                  {detail.status}
                </span>
              </dd>
            </div>
            <div className="b2b-drawer__row"><dt>금액</dt><dd>{amountText}</dd></div>
            <div className="b2b-drawer__row"><dt>시작일</dt><dd>{detail.startDate ?? '-'}</dd></div>
            <div className="b2b-drawer__row"><dt>종료일</dt><dd>{detail.endDate ?? '-'}</dd></div>
            <div className="b2b-drawer__row"><dt>발행일</dt><dd>{detail.issueDate ?? '-'}</dd></div>
          </dl>
        )}
      </div>
      <div className="b2b-drawer__footer">
        <button
          type="button"
          className="b2b-drawer__primary-btn"
          onClick={() => onOpenPage(`/fitb/contract/${id}`)}
        >
          계약서 상세 열기
        </button>
      </div>
    </>
  );
}

// kind='settle'/'expense'/'item' 탭 본문
function DataTabContent({ kind, data }) {
  const rows = buildRows(kind, data);

  return (
    <div className="b2b-drawer__fields">
      {rows.length === 0 ? (
        <p className="b2b-drawer__message">표시할 데이터가 없습니다.</p>
      ) : (
        <dl className="b2b-drawer__list">
          {rows.map((row) => (
            <div className="b2b-drawer__row" key={row.key}>
              <dt>{row.label}</dt>
              <dd className={row.tone ? `b2b-drawer__value--${row.tone}` : undefined}>{row.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function B2bDrawer() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const rootRef = useRef(null);
  const tabListRef = useRef(null);
  const dropdownRef = useRef(null);
  const dragRef = useRef(null);

  // 창 크기 조절 시 폭 리사이징 대응
  useEffect(() => {
    const handleWindowResize = () => {
      setWidth((prev) => clampWidth(prev));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // 'b2b-drawer-open' 커스텀 이벤트 수신
  useEffect(() => {
    const onOpen = (event) => {
      const { kind, id, title, data } = event.detail || {};
      if (!kind || id === undefined || id === null) return;
      const key = `${kind}:${id}`;
      setTabs((prev) => {
        if (prev.some((tab) => tab.key === key)) return prev;
        return [...prev, { key, kind, id, title: title || `${kind} ${id}`, data }];
      });
      setActiveKey(key);
      setCollapsed(false);
    };
    window.addEventListener('b2b-drawer-open', onOpen);
    return () => window.removeEventListener('b2b-drawer-open', onOpen);
  }, []);

  // 바깥 클릭 시 접기
  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (rootRef.current && rootRef.current.contains(event.target)) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
        return;
      }
      setCollapsed(true);
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // 드로어 상태 전파
  useEffect(() => {
    const activeKind = tabs.find((tab) => tab.key === activeKey)?.kind ?? null;
    window.dispatchEvent(new CustomEvent('b2b-drawer-state', {
      detail: { activeKind, collapsed: collapsed || tabs.length === 0 },
    }));
  }, [tabs, activeKey, collapsed]);

  useLayoutEffect(() => {
    const el = tabListRef.current;
    setHasOverflow(el ? el.scrollWidth > el.clientWidth + 1 : false);
  }, [tabs, width, collapsed]);

  const handleResizeStart = (event) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    const onMove = (e) => {
      if (!dragRef.current) return;
      setWidth(clampWidth(dragRef.current.startWidth + (dragRef.current.startX - e.clientX)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const closeTab = (key) => {
    setDropdownOpen(false);
    const index = tabs.findIndex((tab) => tab.key === key);
    if (index < 0) return;
    const next = tabs.filter((tab) => tab.key !== key);
    if (key === activeKey) {
      const neighbor = next[index] ?? next[index - 1] ?? null;
      setActiveKey(neighbor ? neighbor.key : null);
    }
    setTabs(next);
  };

  const closeAll = () => {
    setTabs([]);
    setActiveKey(null);
    setDropdownOpen(false);
    setCollapsed(false);
  };

  const openPage = (path) => {
    setCollapsed(true);
    setDropdownOpen(false);
    navigate(path);
  };

  if (tabs.length === 0) return null;

  return (
    <aside
      ref={rootRef}
      className="b2b-drawer"
      style={{ width: `${width}px`, display: collapsed ? 'none' : undefined }}
      aria-label="통합 드로어"
    >
      <div
        className="b2b-drawer__resize-handle"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="드로어 폭 조절"
      >
        <span className="b2b-drawer__resize-bar" />
      </div>

      <div className="b2b-drawer__inner">
        <div className="b2b-drawer__tabbar">
          <div className="b2b-drawer__tabs" ref={tabListRef} role="tablist">
            {tabs.map((tab) => (
              <div
                key={tab.key}
                role="tab"
                tabIndex={0}
                aria-selected={tab.key === activeKey}
                className={`b2b-drawer__tab${tab.key === activeKey ? ' b2b-drawer__tab--active' : ''}`}
                onClick={() => setActiveKey(tab.key)}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveKey(tab.key); }}
              >
                <span className="b2b-drawer__tab-label" title={tab.title}>{tab.title}</span>
                <button
                  type="button"
                  className="b2b-drawer__tab-close"
                  title="탭 닫기"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.key); }}
                >
                  <NavIcon id="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          {hasOverflow && (
            <div className="b2b-drawer__dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="b2b-drawer__icon-btn"
                title="열린 탭 목록"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <NavIcon id="chevron" size={16} className="ui-icon ui-icon--down" />
              </button>
              {dropdownOpen && (
                <ul className="b2b-drawer__dropdown-list">
                  {tabs.map((tab) => (
                    <li key={tab.key}>
                      <button
                        type="button"
                        className={`b2b-drawer__dropdown-item${tab.key === activeKey ? ' b2b-drawer__dropdown-item--active' : ''}`}
                        onClick={() => { setActiveKey(tab.key); setDropdownOpen(false); }}
                      >
                        {tab.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            className="b2b-drawer__icon-btn"
            title="모두 닫기"
            onClick={closeAll}
          >
            <NavIcon id="close" size={18} />
          </button>
        </div>

        <div className="b2b-drawer__body">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="b2b-drawer__panel"
              style={{ display: tab.key === activeKey ? undefined : 'none' }}
            >
              {tab.kind === 'ai' ? (
                <AiChat onNavigate={openPage} />
              ) : tab.kind === 'contract' ? (
                <ContractTabContent id={tab.id} onOpenPage={openPage} />
              ) : tab.kind === 'report' ? (
                <FactorDetailLoader
                  statKey={tab.data?.statKey}
                  gymId={tab.data?.gymId}
                  mode={tab.data?.mode}
                  period={tab.data?.period}
                />
              ) : tab.kind === 'riskmembers' ? (
                <RiskMembersPanel data={tab.data} />
              ) : (
                <DataTabContent kind={tab.kind} data={tab.data} />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default B2bDrawer;
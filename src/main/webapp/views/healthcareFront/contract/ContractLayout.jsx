import { NavLink, Outlet } from 'react-router-dom';
import { normalizeRole } from '../config/uiNavigation.js';
import './Contract.css';

// 계약 패키지 2Depth 메뉴 레이아웃 (1Depth: Contract)
// 역할별 탭 구성 (2026-07-21 확정)
//  - OWNER·ADMIN: 탭 없이 계약서 리스트(Contractpage)만 노출
//  - TRAINER: Contract(계약서 리스트) / Salary(급여, 기능 구현 예정) 2탭
const ROLE_TABS = {
  trainer: [
    { to: '/fitb/contractpage', label: 'Contract', end: true },
    { to: '/fitb/contractpage/salary', label: 'Salary' },
  ],
};

function ContractLayout() {
  // localStorage 예외 처리 구문
  const getLoginUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };

  const loginUser = getLoginUser();
  const tabs = ROLE_TABS[normalizeRole(loginUser?.role)] ?? [];

  // NavLink 활성 탭 클래스 처리
  const tabClass = ({ isActive }) => (isActive ? 'contract-tab active' : 'contract-tab');

  return (
    <div className="contract-layout">
      {tabs.length > 0 && (
        <nav className="contract-tabs" aria-label="계약 세부 메뉴">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={tabClass}>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </div>
  );
}

export default ContractLayout;
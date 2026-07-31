import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { isGymRole, ROLE_LABEL, normalizeRole } from '../config/uiNavigation.js';
import './B2bMain.css';

function B2bMain() {
  const location = useLocation();
  const [user, setUser] = useState({});

  // localStorage 예외 처리 및 세션 상태 동기화
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('마이페이지 사용자 정보 로드 실패:', e);
    }
  }, [location.pathname]);

  const roleKey = normalizeRole(user.role);
  const showGymMenus = isGymRole(roleKey);
  const roleLabel = ROLE_LABEL[roleKey] || '관리자';

  return (
    <section className="b2b-profile-page">
      <header className="b2b-profile-page__header">
        <p className="b2b-profile-page__badge">{roleLabel} MYPAGE</p>
        <h1>{user.name || roleLabel}님의 마이페이지</h1>
        <span>계정과 알림, 센터 운영 및 회원 관리 정보를 통합 관리합니다.</span>
      </header>

      <nav className="b2b-profile-page__grid" aria-label="마이페이지 네비게이션 메뉴">
        {showGymMenus && (
          <Link to="b2bcomplaint" className="b2b-profile-page__card">
            <strong>📋 회원건의 접수현황</strong>
            <span>회원이 접수한 건의사항과 처리 상태를 확인합니다.</span>
          </Link>
        )}

        <Link to="notification" className="b2b-profile-page__card">
          <strong>🔔 알림 내역</strong>
          <span>계약, 정산, 물품과 운영 알림을 확인합니다.</span>
        </Link>

        <Link to="account" className="b2b-profile-page__card">
          <strong>⚙️ 계정 설정</strong>
          <span>내 계정 정보와 기본 설정을 관리합니다.</span>
        </Link>

        {showGymMenus && (
          <Link to="/fitb/report" className="b2b-profile-page__card">
            <strong>📊 회원·이탈 분석</strong>
            <span>회원 현황과 AI 이탈 위험 분석 결과를 확인합니다.</span>
          </Link>
        )}

        {showGymMenus && (
          <Link to="b2bcoupon" className="b2b-profile-page__card">
            <strong>🎟️ 쿠폰 발송 대상 선택</strong>
            <span>이탈위험 회원 목록을 기반으로 쿠폰 발송 대상을 지정합니다.</span>
          </Link>
        )}
      </nav>

      <div className="b2b-profile-page__outlet">
        {/* 하위 컴포넌트로 user 정보를 context로 전달 */}
        <Outlet context={{ user }} />
      </div>
    </section>
  );
}

export default B2bMain;
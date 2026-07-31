import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceConfirm from './AttendanceConfirm.jsx';
import OwnerManagement from './OwnerManagement.jsx';
import AdminManagement from './AdminManagement.jsx';
import { B2B_ROLES, normalizeRole } from '../config/uiNavigation.js';
import './B2bManagementPage.css';

function B2bManagementPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      // 1. 비로그인 세션 예외 처리 -> 로그인 페이지 이동
      if (!stored || !token) {
        alert('로그인이 필요합니다.');
        navigate('/', { replace: true });
        return;
      }

      const user = JSON.parse(stored);
      const parsedRole = normalizeRole(user?.role);
      setRole(parsedRole);

      // 2. B2C 일반 회원 권한 예외 처리 -> B2C 메인 이동
      if (parsedRole === 'member') {
        alert('관리자 권한이 없습니다.');
        navigate('/fitc', { replace: true });
        return;
      }
    } catch (e) {
      console.error('사용자 정보 로드 실패:', e);
      navigate('/', { replace: true });
    } finally {
      setIsInitializing(false);
    }
  }, [navigate]);

  if (isInitializing) {
    return (
      <div className="b2b-management-page__loading">
        <p>권한 확인 중...</p>
      </div>
    );
  }

  return (
    <section className="b2b-management-page" aria-label="B2B 통합 관리 페이지">
      {role === 'trainer' && <AttendanceConfirm />}
      {role === 'owner' && <OwnerManagement onGoPromotion={() => navigate('/fitb/promotion')} />}
      {role === 'admin' && <AdminManagement />}
      {!B2B_ROLES.includes(role) && (
        <p className="b2b-management-page__empty">
          이 역할에서 사용할 수 있는 관리 화면이 없습니다.
        </p>
      )}
    </section>
  );
}

export default B2bManagementPage;
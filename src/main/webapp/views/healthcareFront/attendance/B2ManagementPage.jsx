import { useNavigate } from 'react-router-dom';
import AttendanceConfirm from './AttendanceConfirm.jsx';
import OwnerManagement from './OwnerManagement.jsx';
import AdminManagement from './AdminManagement.jsx';
import { B2B_ROLES, normalizeRole } from '../config/uiNavigation.js';
import './B2bManagementPage.css';

function B2bManagementPage() {
  const navigate = useNavigate();

  // localStorage JSON 파싱 안전 처리 (Crash 방지)
  const getUserRole = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return '';
      const user = JSON.parse(stored);
      return normalizeRole(user?.role);
    } catch (e) {
      console.error('사용자 정보 로드 실패:', e);
      return '';
    }
  };

  const role = getUserRole();

  return (
    <section className="b2b-management-page" aria-label="B2B 통합 관리 페이지">
      {role === 'trainer' && <AttendanceConfirm />}
      {role === 'owner' && <OwnerManagement onGoPromotion={() => navigate('/fitb/promotion')} />}
      {role === 'admin' && <AdminManagement />}
      {!B2B_ROLES.includes(role) && (
        <p className="b2b-management-page__empty">이 역할에서 사용할 수 있는 관리 화면이 없습니다.</p>
      )}
    </section>
  );
}

export default B2bManagementPage;
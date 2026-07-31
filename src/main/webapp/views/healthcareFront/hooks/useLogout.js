import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티

/**
 * 전역 로그아웃 처리를 위한 커스텀 훅
 * - 서버 세션 파괴 API 호출
 * - 로컬 스토리지 토큰 및 유저 정보 삭제
 * - 메인 페이지 전환 및 알림
 */
function useLogout() {
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    const token = localStorage.getItem('accessToken');

    try {
      if (token) {
        // fetchWithToken을 활용하여 토큰 만료 시에도 최선의 로그아웃 요청 시도
        await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/member/logout`, {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('서버 로그아웃 세션 파괴 실패:', error);
    } finally {
      // 서버 성공/실패 여부와 관계없이 클라이언트 세션 강제 초기화
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // 전역 인증 상태 변경 이벤트 전파 (필요 시 활용)
      window.dispatchEvent(new Event('auth-change'));

      alert('로그아웃되었습니다.');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return handleLogout;
}

export default useLogout;
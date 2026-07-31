/**
 * 리프레시 토큰 동시 갱신(Race Condition) 방지용 싱글톤 Promise
 * @type {Promise<string> | null}
 */
let isRefreshingPromise = null;

/**
 * 액세스 토큰 만료(401) 시 Silent Refresh를 자동으로 수행해주는 공통 fetch 래퍼 유틸리티
 * 
 * @param {string} url - 요청 대상 API URL
 * @param {RequestInit} [options={}] - fetch 옵션 객체
 * @returns {Promise<Response>} fetch Response 객체
 */
export const fetchWithToken = async (url, options = {}) => {
  // 1. 기존 options 및 headers 안전 복사 (원본 오염 방지)
  const config = { ...options };
  const headers = new Headers(config.headers || {});

  // 2. Content-Type 처리 (기존에 전달된 게 없고, FormData가 아닐 때만 application/json 기본 적용)
  if (!headers.has('Content-Type') && !(config.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 3. 로컬스토리지에서 액세스 토큰 추출 및 헤더 세팅
  let accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  config.headers = headers;

  // 4. 1차 API 호출 시도
  let response = await fetch(url, config);

  // 5. 엑세스 토큰 만료(401) 발생 시 Silent Refresh 트리거
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      handleSessionExpired();
      return response;
    }

    try {
      // 6. 동시 다발적인 401 요청 시 리프레시 API 중복 호출 방지 (Single Flight Pattern)
      if (!isRefreshingPromise) {
        isRefreshingPromise = (async () => {
          const refreshResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            return newAccessToken;
          } else {
            handleSessionExpired();
            throw new Error('Refresh Token Expired');
          }
        })().finally(() => {
          // 토큰 갱신 작업 완료 후 Promise 리셋
          isRefreshingPromise = null;
        });
      }

      // 진행 중인 리프레시 작업 대기 및 신규 토큰 수령
      const newAccessToken = await isRefreshingPromise;

      // 7. 새로 발급받은 토큰으로 Authorization 헤더 교체 후 원래 요청 재시도
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      config.headers = headers;
      response = await fetch(url, config);

    } catch (err) {
      console.error('Silent Refresh 통신 실패:', err);
      // 세션 만료 처리는 handlesessionExpired에서 진행됨
      return response;
    }
  }

  return response;
};

/**
 * 로그인 세션 강제 만료 및 상태 초기화 처리 함수
 */
const handleSessionExpired = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // 중복 alert 방지
  if (!window.isSessionAlerting) {
    window.isSessionAlerting = true;
    alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
    window.location.href = '/';
  }
};
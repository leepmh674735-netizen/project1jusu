import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

// 로그인 페이지 컴포넌트 — 디자인 시스템 v1.0 (480px 카드 + 블랙 확정 버튼)
function Login() {
  const formRef = useRef(null);
  const navigate = useNavigate();

  // 로그인 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    const rawUsername = data.username?.trim() || '';
    const password = data.password;

    // 하이픈(-) 제외 숫자만 추출
    const username = rawUsername.replace(/-/g, '');

    // 전화번호 유효성 검사 (10~11자리 숫자)
    if (!/^\d{10,11}$/.test(username)) {
      alert('올바른 전화번호 형식을 입력해 주세요. (예: 01012345678)');
      return;
    }

    const submitData = {
      username: username, // 문자열로 유지하여 앞자리 '0' 보존 (01012345678)
      password: password,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();

        // 토큰 및 사용자 정보 저장 (accessToken / token 둘 다 대응)
        const token = result.token || result.accessToken;
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.member));

        alert(`${result.member?.name || '회원'}님 환영합니다.`);

        // 역할(Role)에 따른 페이지 이동 분기
        if (result.member?.role === 'member') {
          navigate('/fitc');
        } else {
          navigate('/fitb');
        }
      } else {
        const errorText = await response.text();
        alert(errorText || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <strong>Haru Health</strong>
          <small>MANAGEMENT</small>
        </div>
        <form className="auth-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>전화번호 (아이디)</label>
            <input 
              type="tel" 
              name="username" 
              required 
              placeholder="예: 01012345678" 
              autoComplete="username"
            />
          </div>
          <div className="auth-field">
            <label>비밀번호</label>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="비밀번호 입력" 
              autoComplete="current-password"
            />
          </div>
          <button className="auth-submit" type="submit">로그인</button>
        </form>
        <p className="auth-foot">
          계정이 없으신가요?
          <Link to="/join">계정 추가</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티

// B2C 일반 회원용 계정 설정 수정 컴포넌트
function B2cAccount() {
  const navigate = useNavigate();

  // localStorage 예외 처리
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getUserData();

  // 상태 관리
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 계정 정보 수정 요청 핸들러
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (loading) return;

    // 새 비밀번호가 입력된 경우에만 비밀번호 일치 확인
    if (password && password !== passwordCheck) {
      setMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setMessage('');

    // 요청 바디 생성 (비밀번호를 입력한 경우만 비밀번호 필드 포함)
    const requestBody = {
      email: email.trim(),
    };

    if (password) {
      requestBody.password = password;
      requestBody.passwordCheck = passwordCheck;
    }

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/member/update`, {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        if (password) {
          // 1. 비밀번호가 변경된 경우 -> 보안을 위해 강제 로그아웃 후 재로그인 유도
          alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.');
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/');
        } else {
          // 2. 이메일만 변경된 경우 -> 로컬스토리지 user 정보 갱신 후 안내
          const updatedUser = { ...user, email: email.trim() };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          alert('계정 정보가 성공적으로 수정되었습니다.');
        }
      } else {
        const errorText = await response.text();
        setMessage(errorText || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('정보 수정 중 오류 발생:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>내 계정 설정</h3>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 15px 0' }}>
        회원님의 이메일과 비밀번호를 변경할 수 있습니다.
      </p>

      {message && (
        <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px', fontWeight: 'bold' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>
            아이디 (전화번호)
          </label>
          <input 
            type="text" 
            value={user.username || ''} 
            disabled 
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: '#6b7280' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>
            이메일 주소
          </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="example@domain.com"
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>
            새 비밀번호 (선택)
          </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="변경 시에만 입력해 주세요"
            style={inputStyle} 
            autoComplete="new-password"
          />
        </div>

        {password && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>
              새 비밀번호 확인
            </label>
            <input 
              type="password" 
              value={passwordCheck} 
              onChange={(e) => setPasswordCheck(e.target.value)} 
              required={Boolean(password)}
              placeholder="변경할 새 비밀번호 재입력"
              style={inputStyle} 
              autoComplete="new-password"
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px', 
            backgroundColor: loading ? '#9ca3af' : '#007bff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold', 
            marginTop: '8px' 
          }}
        >
          {loading ? '수정 중...' : '수정 완료'}
        </button>
      </form>
    </div>
  );
}

export default B2cAccount;
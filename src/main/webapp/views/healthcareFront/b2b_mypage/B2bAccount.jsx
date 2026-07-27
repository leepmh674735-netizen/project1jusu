import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

    // 1차 클라이언트 검증: 비밀번호 일치 확인
    if (password !== passwordCheck) {
      setMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email,
          password: password,
          passwordCheck: passwordCheck
        })
      });

      if (response.ok) {
        alert('계정 정보가 성공적으로 변경되었습니다. 다시 로그인해 주세요.');
        
        // 개인정보 변경 성공 시 세션 클리어 후 로그아웃 리다이렉트
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/');
      } else {
        const errorText = await response.text();
        setMessage(errorText || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('정보 수정 중 오류 발생:', error);
      setMessage('서버와의 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h3>내 계정 설정</h3>
      <p style={{ fontSize: '13px', color: '#666' }}>회원님의 비밀번호와 이메일을 수정할 수 있습니다.</p>

      {message && <div style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{message}</div>}

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>아이디 (전화번호)</label>
          <input 
            type="text" 
            value={user.username || ''} 
            disabled 
            style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>이메일 주소</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="example@domain.com"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>새 비밀번호 입력</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="변경할 새 비밀번호"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>새 비밀번호 확인</label>
          <input 
            type="password" 
            value={passwordCheck} 
            onChange={(e) => setPasswordCheck(e.target.value)} 
            required 
            placeholder="변경할 새 비밀번호 재입력"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px', 
            backgroundColor: loading ? '#ccc' : '#007bff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold', 
            marginTop: '10px' 
          }}
        >
          {loading ? '수정 중...' : '수정 완료'}
        </button>
      </form>
    </div>
  );
}

export default B2cAccount;
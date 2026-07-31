import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 사용 권장
import './Auth.css';

function Join() {
  const formRef = useRef(null);
  const checkedIdRef = useRef('');
  const navigate = useNavigate();

  const [role, setRole] = useState('owner');
  const [gymList, setGymList] = useState([]);
  const [name, setName] = useState('');
  const [isIdChecked, setIsIdChecked] = useState(false);

  // [보안 인증] 마운트 시 admin 권한 검증
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      alert('접근 권한이 없습니다. 총괄 관리자(admin)만 회원 추가가 가능합니다.');
      if (user.role === 'owner' || user.role === 'trainer') {
        navigate('/fitb');
      } else {
        navigate('/');
      }
    }
  }, [navigate]);

  // 체육관 목록 조회
  useEffect(() => {
    const fetchGymList = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/gym/selectid`);
        if (response.ok) {
          const data = await response.json();
          setGymList(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('체육관 목록 조회 실패:', error);
      }
    };
    fetchGymList();
  }, []);

  // 전화번호 중복 확인
  const handleIdCheck = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const username = formData.get('username')?.trim();

    if (!username) {
      alert('전화번호(아이디)를 입력해 주세요.');
      return;
    }

    if (!/^\d{10,11}$/.test(username)) {
      alert('하이픈(-) 없이 올바른 전화번호 숫자만 입력해 주세요.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/idcheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 백엔드가 숫자형/문자열 중 요구하는 스펙에 맞춰 전달 (문자열 전송 권장)
        body: JSON.stringify({ username: username }),
      });

      if (response.ok) {
        const result = await response.text();
        if (result === 'Available') {
          alert('등록 가능한 전화번호입니다.');
          checkedIdRef.current = username;
          setIsIdChecked(true);
        } else {
          alert('이미 가입된 전화번호입니다.');
          checkedIdRef.current = '';
          setIsIdChecked(false);
        }
      } else {
        alert('중복 확인 실패: 서버 응답 오류');
      }
    } catch (error) {
      console.error('중복확인 오류:', error);
      alert('통신 오류가 발생했습니다.');
    }
  };

  // 회원가입 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    const username = data.username?.trim();
    if (!checkedIdRef.current || checkedIdRef.current !== username) {
      alert('전화번호 중복 확인을 먼저 수행해 주세요.');
      return;
    }

    if (data.password !== data.passwordCheck) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    const submitData = {
      username: username, // 문자열 형태로 010... 보존
      password: data.password,
      passwordCheck: data.passwordCheck,
      name: name,
      email: data.email || null,
      role: role,
      gymId: role === 'owner' ? parseInt(data.gymId, 10) : 0,
    };

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/member/join`, {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('신규 회원이 정상적으로 등록되었습니다.');
        navigate('/fitb');
      } else {
        const errorText = await response.text();
        alert(errorText || '회원 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('오류 발생:', error);
      alert('통신 오류가 발생했습니다.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <strong>Haru Health</strong>
          <small>MANAGEMENT</small>
        </div>
        <h2 className="auth-title">신규 회원 등록 (관리자 전용)</h2>
        <form className="auth-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="auth-field auth-field--inline">
            <div>
              <label>전화번호 (아이디)</label>
              <input
                type="tel"
                name="username"
                required
                placeholder="예: 01012345678"
                onChange={() => {
                  if (isIdChecked) {
                    setIsIdChecked(false);
                    checkedIdRef.current = '';
                  }
                }}
              />
            </div>
            <button
              className="auth-check-btn"
              type="button"
              onClick={handleIdCheck}
              style={{ backgroundColor: isIdChecked ? '#10b981' : undefined, color: isIdChecked ? '#fff' : undefined }}
            >
              {isIdChecked ? '확인완료' : '중복 확인'}
            </button>
          </div>

          <div className="auth-field">
            <label>임시 비밀번호</label>
            <input type="password" name="password" required />
          </div>

          <div className="auth-field">
            <label>임시 비밀번호 확인</label>
            <input type="password" name="passwordCheck" required />
          </div>

          <div className="auth-field">
            <label>이름</label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role === 'owner'}
            />
          </div>

          <div className="auth-field">
            <label>이메일 (선택)</label>
            <input type="email" name="email" />
          </div>

          <div className="auth-field">
            <label>등록할 권한 유형</label>
            <select
              name="role"
              required
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value;
                setRole(selectedRole);
                if (selectedRole === 'admin') {
                  setName('');
                }
              }}
            >
              <option value="owner">체육관 사장 (owner)</option>
              <option value="admin">총괄 관리자 (admin)</option>
            </select>
          </div>

          <div className="auth-field">
            <label>소속 사업장</label>
            {role === 'owner' ? (
              <select
                name="gymId"
                required
                onChange={(e) => {
                  const selectedOption = e.target.options[e.target.selectedIndex];
                  const gymName = selectedOption.getAttribute('data-gymname');
                  if (e.target.value && gymName) {
                    setName(gymName + " 사장님");
                  } else {
                    setName('');
                  }
                }}
              >
                <option value="">-- 선택 --</option>
                {gymList.map((gym) => (
                  <option key={gym.gymId} value={gym.gymId} data-gymname={gym.gymName}>
                    {gym.gymId} ({gym.gymName || '지점'})
                  </option>
                ))}
              </select>
            ) : (
              <input type="number" name="gymId" value={0} readOnly />
            )}
          </div>

          <button className="auth-submit" type="submit">등록하기</button>
        </form>
        <p className="auth-foot">
          <Link to="/fitb">관리자 대시보드로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}

export default Join;
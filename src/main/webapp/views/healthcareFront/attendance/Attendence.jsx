import { useEffect, useRef, useState } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import './Attendance.css';

// 헬스장 입구 공용 태블릿(키오스크)용 출석 페이지 - 로그인 없이 접근
function Attendance() {
  const formRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);

  const [mode, setMode] = useState(null); // null=선택화면, 'gym'=헬스장, 'pt'=PT
  const [result, setResult] = useState(null); // 출석 완료 응답
  const [loading, setLoading] = useState(false);

  // 타이머 정리 헬퍼
  const clearAutoResetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  // 초기 선택 화면으로 리셋
  const handleReset = () => {
    clearAutoResetTimer();
    clearIdleTimer();
    setMode(null);
    setResult(null);
  };

  // 폼 입력 시 일정 시간 미입력 시 자동 리셋 (30초)
  const resetIdleTimer = () => {
    clearIdleTimer();
    if (mode && !result) {
      idleTimerRef.current = setTimeout(() => {
        handleReset();
      }, 30000); // 30초간 입력 없을 시 메인으로 복귀
    }
  };

  // 언마운트 시 모든 타이머 해제
  useEffect(() => {
    return () => {
      clearAutoResetTimer();
      clearIdleTimer();
    };
  }, []);

  // 모드 변경 시 타임아웃 타이머 셋업
  useEffect(() => {
    if (mode && !result) {
      resetIdleTimer();
    }
  }, [mode, result]);

  // 출석 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    clearIdleTimer();

    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    // 숫자가 아닌 문자(하이픈 등) 제거
    const cleanUsername = String(data.username || '').replace(/\D/g, '');

    // 010으로 시작하는 10~11자리 숫자 검증
    if (!/^\d{10,11}$/.test(cleanUsername)) {
      alert('올바른 전화번호 형식을 입력해 주세요. (예: 01012345678)');
      resetIdleTimer();
      return;
    }

    const submitData = {
      username: cleanUsername, // 문자열 형태로 넘겨 010... 앞자리 0 보존
      password: data.password,
    };

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitc/attendance/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const row = await response.json();
        setResult(row);
        
        // 완료 화면 7초 후 자동 리셋 타이머
        clearAutoResetTimer();
        timerRef.current = setTimeout(handleReset, 7000);
      } else {
        const errorText = await response.text();
        alert(errorText || '출석 처리에 실패했습니다. 아이디 및 비밀번호를 확인해 주세요.');
        resetIdleTimer();
      }
    } catch (error) {
      console.error('출석 처리 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
      resetIdleTimer();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="attendance-kiosk" onClick={resetIdleTimer} onKeyDown={resetIdleTimer}>
      <header className="attendance-kiosk__header">
        <h1 className="attendance-kiosk__title">
          <NavIcon id="dumbbell" size={24} className="ui-icon" /> 출석 체크
        </h1>
        <p className="attendance-kiosk__description">출석 유형을 선택한 뒤 본인 계정으로 확인해 주세요.</p>
      </header>

      {/* 3화면: 출석 완료 안내 */}
      {result ? (
        <section className="attendance-kiosk__result" aria-live="polite">
          <div className="attendance-kiosk__result-icon" aria-hidden="true">
            <NavIcon id="check" size={40} />
          </div>
          <h2 className="attendance-kiosk__result-title">{result.memberName || '회원'}님 출석 완료!</h2>
          {result.inoutType === 2 ? (
            <p className="attendance-kiosk__result-copy">
              PT 출석이 접수되었습니다.<br />
              담당 트레이너 확인 후 잔여 횟수가 차감됩니다. (현재 잔여 {result.remainingCount ?? 0}회)
            </p>
          ) : (
            <p className="attendance-kiosk__result-copy">오늘도 즐거운 운동 되세요!</p>
          )}
          <button type="button" onClick={handleReset} className="attendance-kiosk__reset">
            확인
          </button>
        </section>
      ) : mode === null ? (
        /* 1화면: 출석 유형 선택 버튼 */
        <section className="attendance-kiosk__chooser" aria-label="출석 유형 선택">
          <button type="button" onClick={() => setMode('gym')} className="attendance-kiosk__type-button attendance-kiosk__type-button--gym">
            <span className="attendance-kiosk__type-icon" aria-hidden="true"><NavIcon id="dumbbell" size={32} /></span>
            <span className="attendance-kiosk__type-label">헬스장 출석</span>
          </button>
          <button type="button" onClick={() => setMode('pt')} className="attendance-kiosk__type-button attendance-kiosk__type-button--pt">
            <span className="attendance-kiosk__type-icon" aria-hidden="true"><NavIcon id="handshake" size={32} /></span>
            <span className="attendance-kiosk__type-label">PT 출석</span>
          </button>
        </section>
      ) : (
        /* 2화면: 계정 입력 폼 */
        <section className={`attendance-kiosk__card attendance-kiosk__card--${mode}`}>
          <h2 className="attendance-kiosk__card-title">
            <NavIcon id={mode === 'gym' ? 'dumbbell' : 'handshake'} size={20} className="ui-icon" />
            {' '}{mode === 'gym' ? '헬스장 출석' : 'PT 출석'}
          </h2>
          {mode === 'pt' && (
            <p className="attendance-kiosk__note">
              접수 후 담당 트레이너가 확인하면 잔여 횟수가 1회 차감됩니다.
            </p>
          )}
          <form ref={formRef} onSubmit={handleSubmit} className="attendance-kiosk__form">
            <div className="attendance-kiosk__field">
              <label htmlFor="kiosk-username" className="attendance-kiosk__label">전화번호 (아이디)</label>
              <input
                id="kiosk-username"
                type="tel"
                name="username"
                required
                autoFocus
                placeholder="예: 01012345678"
                autoComplete="off"
                className="attendance-kiosk__input"
              />
            </div>
            <div className="attendance-kiosk__field">
              <label htmlFor="kiosk-password" className="attendance-kiosk__label">비밀번호</label>
              <input
                id="kiosk-password"
                type="password"
                name="password"
                required
                autoComplete="off"
                className="attendance-kiosk__input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`attendance-kiosk__submit attendance-kiosk__submit--${mode}`}
            >
              {loading ? '처리 중...' : '출석하기'}
            </button>
          </form>
          <button type="button" onClick={handleReset} className="attendance-kiosk__reset">
            <NavIcon id="arrow" size={18} className="ui-icon ui-icon--left" /> 처음으로
          </button>
        </section>
      )}
    </main>
  );
}

export default Attendance;
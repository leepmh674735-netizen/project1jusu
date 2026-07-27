import { useState } from 'react';
import './B2cPages.css';

const SCALE_LABELS = ['매우좋음', '좋음', '보통', '나쁨', '매우나쁨'];
const COMPLAINT_GROUPS = [
  { group: '서비스 불만', items: [
    { key: 'serviceRate1', label: '비매너 회원' },
    { key: 'serviceRate2', label: '환경 불편' },
  ] },
  { group: '기구 불만', items: [
    { key: 'equipRate1', label: '기구 상태 불만' },
    { key: 'equipRate2', label: '기구 부족' },
  ] },
  { group: '직원 불만', items: [
    { key: 'employeeRate1', label: '불친절' },
    { key: 'employeeRate2', label: '전문성 부족' },
  ] },
  { group: '가격 불만', items: [
    { key: 'costRate', label: '가격 불만' },
  ] },
];

const RATE_KEYS = COMPLAINT_GROUPS.flatMap((g) => g.items.map((it) => it.key));

function B2cSurvey() {
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getUserData();

  const [username, setUsername] = useState(user.username ? String(user.username) : '');
  const [rates, setRates] = useState(() =>
    Object.fromEntries(RATE_KEYS.map((k) => [k, 0])),
  );
  const [injuryIssue, setInjuryIssue] = useState(false);
  const [injuryArea, setInjuryArea] = useState('');
  const [loading, setLoading] = useState(false);

  const setRate = (key, v) => setRates((prev) => ({ ...prev, [key]: v }));

  const renderScale = (value, onChange) =>
    [1, 2, 3, 4, 5].map((n) => (
      <span key={n} className="b2c-rating__option">
        <button
          type="button"
          title={SCALE_LABELS[n - 1]}
          onClick={() => onChange(n)}
          className={`b2c-rating__button${n === value ? ' is-selected' : ''}`}
          aria-pressed={n === value}
        >
          {n}
        </button>
        <span className="b2c-rating__label">{SCALE_LABELS[n - 1]}</span>
      </span>
    ));

  const ScaleRow = ({ label, field }) => (
    <div className="b2c-survey__row">
      <span className="b2c-survey__item-label">{label}</span>
      <div className="b2c-rating">{renderScale(rates[field], (v) => setRate(field, v))}</div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const cleanUsername = String(username || '').replace(/\D/g, '');

    if (!cleanUsername || Number.isNaN(Number(cleanUsername))) {
      alert('아이디(전화번호 숫자)를 정확히 입력해주세요.');
      return;
    }
    if (RATE_KEYS.some((k) => !rates[k])) {
      alert('불만 항목을 모두 선택해주세요.');
      return;
    }
    if (injuryIssue && !injuryArea.trim()) {
      alert('부상 부위를 입력해주세요.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    setLoading(true);

    const submitData = {
      username: Number(cleanUsername),
      serviceRate1: rates.serviceRate1,
      serviceRate2: rates.serviceRate2,
      costRate: rates.costRate,
      equipRate1: rates.equipRate1,
      equipRate2: rates.equipRate2,
      employeeRate1: rates.employeeRate1,
      employeeRate2: rates.employeeRate2,
      injuryIssue,
      injuryArea: injuryIssue ? injuryArea.trim() : null,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/survey/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('설문이 제출되었습니다. 감사합니다!');
        if (!user.username) setUsername('');
        setRates(Object.fromEntries(RATE_KEYS.map((k) => [k, 0])));
        setInjuryIssue(false);
        setInjuryArea('');
      } else {
        const errorText = await response.text();
        alert(errorText || '제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('설문 제출 오류:', error);
      alert('통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">회원 설문</h2>
        <p className="b2c-page__description">
          각 항목을 매우좋음 ~ 매우나쁨의 5단계로 평가해주세요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="b2c-survey">
        <div className="b2c-form__group">
          <label className="b2c-form__label">아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="회원 아이디(전화번호)"
            required
            disabled={!!user.username}
            className="b2c-form__input"
          />
        </div>

        {COMPLAINT_GROUPS.map((g) => (
          <fieldset key={g.group} className="b2c-survey__fieldset">
            <legend className="b2c-survey__legend">{g.group}</legend>
            {g.items.map((it) => (
              <ScaleRow key={it.key} label={it.label} field={it.key} />
            ))}
          </fieldset>
        ))}

        <div className="b2c-survey__injury">
          <span className="b2c-survey__question">
            최근 한 달 부상 경험이 있나요?
          </span>
          <div className="b2c-survey__radios">
            <label className="b2c-radio-option">
              <input type="radio" name="injuryIssue" checked={injuryIssue === true}
                     onChange={() => setInjuryIssue(true)} /> 있음
            </label>
            <label className="b2c-radio-option">
              <input type="radio" name="injuryIssue" checked={injuryIssue === false}
                     onChange={() => { setInjuryIssue(false); setInjuryArea(''); }} /> 없음
            </label>
          </div>
        </div>

        {injuryIssue && (
          <div className="b2c-form__group">
            <label className="b2c-form__label">부상 부위</label>
            <input
              type="text"
              value={injuryArea}
              onChange={(e) => setInjuryArea(e.target.value)}
              placeholder="예: 오른쪽 어깨"
              required
              className="b2c-form__input"
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="b2c-button">
          {loading ? '제출 중...' : '설문 제출'}
        </button>
      </form>
    </div>
  );
}

export default B2cSurvey;
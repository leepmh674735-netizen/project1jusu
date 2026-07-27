import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3·4=회원 계약 통합폼, 5=PT 체험)
const TYPE_INFO = {
  1: { name: '관리자–헬스장 제휴 계약서', receiverLabel: '대상 헬스장 사장님(Owner)' },
  2: { name: '헬스장–트레이너 임금 계약서', receiverLabel: '대상 트레이너' },
  3: { name: '헬스장–회원 계약서 (이용권/PT 통합)', receiverLabel: '대상 회원' },
  4: { name: '헬스장–회원 계약서 (이용권/PT 통합)', receiverLabel: '대상 회원' },
  5: { name: '헬스장–회원 PT 체험 계약서', receiverLabel: '대상 회원' },
};

function ContractNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contract = parseInt(searchParams.get('contract'), 10);
  const info = TYPE_INFO[contract];
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trialTarget = location.state?.target ?? null;

  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [quantity, setQuantity] = useState('0');
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const isMemberForm = contract === 3 || contract === 4;
  const isPt = isMemberForm && parseInt(quantity || '0', 10) >= 1;

  const abortControllerRef = useRef(null);

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 제휴 계약(1) 작성 시 사장님(OWNER) 목록 조회
  const fetchOwners = useCallback(async () => {
    if (contract !== 1) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/owners`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (response.ok) {
        setOwners(await response.json());
      } else {
        setMessage(`사장님 목록 조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('사장님 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }
  }, [contract]);

  useEffect(() => {
    fetchOwners();
    return () => cancelPendingRequests();
  }, [fetchOwners]);

  // 회원 계약(3·4)·PT 체험(5) 작성 시 본인 소속 트레이너 목록 조회
  const fetchTrainers = useCallback(async () => {
    if (!isMemberForm && contract !== 5) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (response.ok) {
        const roster = await response.json();
        const list = (roster || [])
          .filter((row) => String(row.member?.role || '').toLowerCase() === 'trainer')
          .map((row) => row.member);
        setTrainers(list);

        if (contract === 5 && trialTarget?.baseManagerId) {
          const initial = list.find((t) => String(t.username) === String(trialTarget.baseManagerId)) ?? null;
          setSelectedTrainer(initial);
        }
      } else {
        setMessage(`트레이너 목록 조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('트레이너 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }
  }, [contract, isMemberForm, trialTarget?.baseManagerId]);

  useEffect(() => {
    fetchTrainers();
    return () => cancelPendingRequests();
  }, [fetchTrainers]);

  if (!info) {
    return (
      <div>
        <h1>계약서 작성</h1>
        <p>잘못된 계약 유형입니다.</p>
        <button type="button" onClick={() => navigate('/fitb/contractpage')}>리스트로 돌아가기</button>
      </div>
    );
  }

  if (contract === 5 && !trialTarget) {
    return (
      <div>
        <h1>PT 체험 계약서 작성</h1>
        <p>체험권 계약 대상 목록에서 대상을 선택해 진입해 주세요.</p>
        <button type="button" onClick={() => navigate('/fitb/contractpage/trial')}>체험권 대상 목록으로 이동</button>
      </div>
    );
  }

  // 계약서 발행 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (contract === 1 && !selectedOwner) {
      setMessage('대상 헬스장 사장님을 선택해 주세요.');
      return;
    }

    // 아이디(전화번호) 하이픈 제거 및 숫자 변환
    const cleanReceiverId = data.receiverId ? String(data.receiverId).replace(/\D/g, '') : null;

    const submitData = {
      contract,
      receiverId:
        contract === 1 ? selectedOwner.username
        : contract === 5 ? trialTarget.member.username
        : cleanReceiverId ? parseInt(cleanReceiverId, 10) : null,
      receiverName:
        contract === 1 ? selectedOwner.name
        : contract === 5 ? trialTarget.member.name
        : data.receiverName,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      amount: data.amount ? parseInt(data.amount, 10) : null,
      contractRate: data.contractRate ? parseFloat(data.contractRate) : null,
      quantity:
        isMemberForm ? parseInt(quantity || '0', 10)
        : contract === 5 ? Number(trialTarget.couponCount ?? 0)
        : null,
      managerId: (isPt || contract === 5) ? selectedTrainer?.username ?? null : null,
      sourceCouponId: contract === 5 ? trialTarget.couponId ?? null : null,
      birthDate:
        contract === 5 ? trialTarget.member.birth ?? null
        : data.birthDate || null,
      avgWorkoutHour: data.avgWorkoutHour ? parseInt(data.avgWorkoutHour, 10) : null,
      avgWorkoutMinute: data.avgWorkoutMinute ? parseInt(data.avgWorkoutMinute, 10) : null,
    };

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const dataId = await response.text();
        
        let loginUserRole = '';
        try {
          const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
          loginUserRole = String(loginUser?.role || '').toLowerCase();
        } catch {
          loginUserRole = '';
        }

        if (loginUserRole === 'owner') {
          alert('계약서가 발행되었습니다. 이어서 수신자 서명을 진행해 주세요.');
          navigate(`/fitb/contract/${dataId}`);
        } else {
          alert('계약서가 발행되었습니다. (상태: ISSUED)');
          navigate('/fitb/contractpage');
        }
      } else {
        setMessage(`발행 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('계약서 발행 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>{info.name} 작성</h1>
      {message && <p style={{ color: 'red' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <h2>수신자 정보</h2>
        {contract === 1 && (
          <>
            <div>
              <label htmlFor="owner-select">{info.receiverLabel} 선택: </label>
              <select
                id="owner-select"
                value={selectedOwner?.username ?? ''}
                onChange={(e) => {
                  const owner = owners.find((o) => String(o.username) === e.target.value) ?? null;
                  setSelectedOwner(owner);
                }}
                required
              >
                <option value="">선택</option>
                {owners.map((owner) => (
                  <option key={owner.username} value={owner.username}>
                    {owner.name} ({owner.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="selected-owner-id">수신자 아이디: </label>
              <input id="selected-owner-id" value={selectedOwner?.username ?? ''} readOnly />
            </div>
          </>
        )}
        {contract === 2 && (
          <>
            <div>
              <label htmlFor="receiver-name">수신자 이름: </label>
              <input id="receiver-name" name="receiverName" required />
            </div>
            <div>
              <label htmlFor="receiver-id">수신자 아이디(전화번호): </label>
              <input id="receiver-id" type="tel" name="receiverId" placeholder="예: 01012345678" />
            </div>
          </>
        )}
        {isMemberForm && (
          <>
            <div>
              <label htmlFor="member-receiver-name">수신자 이름: </label>
              <input id="member-receiver-name" name="receiverName" required />
            </div>
            <div>
              <label htmlFor="member-receiver-id">수신자 아이디(전화번호): </label>
              <input id="member-receiver-id" type="tel" name="receiverId" placeholder="예: 01012345678" />
            </div>
            <div>
              <label htmlFor="member-birth-date">수신자 생년월일: </label>
              <input id="member-birth-date" type="date" name="birthDate" />
            </div>
          </>
        )}
        {contract === 5 && (
          <>
            <div><label>이름: </label><input value={trialTarget.member?.name ?? ''} readOnly /></div>
            <div><label>회원 아이디: </label><input value={trialTarget.member?.username ?? ''} readOnly /></div>
            <div><label>이메일: </label><input value={trialTarget.member?.email ?? ''} readOnly /></div>
            <div><label>생년월일: </label><input value={trialTarget.member?.birth ?? ''} readOnly /></div>
            <div><label>계약 유형: </label><input value="PT 체험 (5)" readOnly /></div>
            <div><label>PT 횟수(체험권 제공 횟수): </label><input value={trialTarget.couponCount ?? ''} readOnly /></div>
            {trialTarget.baseDataId && (
              <div>
                <label>기존 계약 연계: </label>
                <input value={`${trialTarget.baseContract === 3 ? '이용권' : 'PT'} 계약 #${trialTarget.baseDataId}`} readOnly />
              </div>
            )}
          </>
        )}

        <h2>계약 조건</h2>
        {contract === 1 && (
          <div>
            <label htmlFor="contract-rate">수수료율(%): </label>
            <input id="contract-rate" type="number" name="contractRate" min="0" step="0.1" required />
          </div>
        )}
        {contract === 2 && (
          <>
            <div>
              <label htmlFor="salary-amount">월 기본급(만원): </label>
              <input id="salary-amount" type="number" name="amount" min="0" required />
            </div>
            <div>
              <label htmlFor="incentive-rate">인센티브 정산비율(%): </label>
              <input id="incentive-rate" type="number" name="contractRate" min="0" max="100" />
            </div>
          </>
        )}
        {isMemberForm && (
          <>
            <div>
              <label htmlFor="pt-quantity">총 PT 횟수(회, 0 = 이용권 계약): </label>
              <input
                id="pt-quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <span> → {isPt ? 'PT 계약(4)으로 발행' : '이용권 계약(3)으로 발행'}</span>
            </div>
            <div>
              <label htmlFor="member-amount">{isPt ? '총 이용금액(만원): ' : '이용 금액(만원): '}</label>
              <input id="member-amount" type="number" name="amount" min="0" required />
            </div>
            {isPt && (
              <div>
                <label htmlFor="trainer-select">담당 트레이너 선택(본인 소속): </label>
                <select
                  id="trainer-select"
                  value={selectedTrainer?.username ?? ''}
                  onChange={(e) => {
                    const trainer = trainers.find((t) => String(t.username) === e.target.value) ?? null;
                    setSelectedTrainer(trainer);
                  }}
                >
                  <option value="">선택</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.username} value={trainer.username}>
                      {trainer.name} ({trainer.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        {contract === 5 && (
          <>
            <div>
              <label htmlFor="trial-amount">금액(만원): </label>
              <input id="trial-amount" type="number" name="amount" min="0" required />
            </div>
            <div>
              <label htmlFor="trial-trainer-select">담당 트레이너 선택(본인 소속): </label>
              <select
                id="trial-trainer-select"
                value={selectedTrainer?.username ?? ''}
                onChange={(e) => {
                  const trainer = trainers.find((t) => String(t.username) === e.target.value) ?? null;
                  setSelectedTrainer(trainer);
                }}
              >
                <option value="">선택</option>
                {trainers.map((trainer) => (
                  <option key={trainer.username} value={trainer.username}>
                    {trainer.name} ({trainer.username})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {(isMemberForm || contract === 5) && (
          <div>
            <label htmlFor="avg-workout-hour">하루평균 운동 시간: </label>
            <select id="avg-workout-hour" name="avgWorkoutHour" defaultValue="">
              <option value="">선택</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <label htmlFor="avg-workout-minute"> 시간 </label>
            <select id="avg-workout-minute" name="avgWorkoutMinute" defaultValue="">
              <option value="">선택</option>
              {[0, 10, 20, 30, 40, 50].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label> 분</label>
          </div>
        )}

        <div>
          <label htmlFor="start-date">계약(이용) 시작일: </label>
          <input id="start-date" type="date" name="startDate" />
        </div>
        <div>
          <label htmlFor="end-date">계약(이용) 종료일: </label>
          <input id="end-date" type="date" name="endDate" />
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? '발행 중...' : '계약서 발행'}
        </button>
        <button type="button" onClick={() => navigate('/fitb/contractpage')}>취소</button>
      </form>
    </div>
  );
}

export default ContractNew;
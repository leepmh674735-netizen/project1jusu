import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT, 5=PT 체험)
// 유형별 라벨
const TYPE_INFO = {
  1: { title: '관리자–헬스장 제휴 계약서', senderLabel: '관리자(플랫폼)', receiverLabel: '헬스장(Owner)' },
  2: { title: '헬스장–트레이너 임금 계약서', senderLabel: '헬스장(Owner)', receiverLabel: '트레이너' },
  3: { title: '헬스장–회원 이용권 계약서', senderLabel: '헬스장(Owner)', receiverLabel: '회원' },
  4: { title: '헬스장–회원 PT 이용권 계약서', senderLabel: '헬스장(Owner)', receiverLabel: '회원' },
  5: { title: '헬스장–회원 PT 체험 계약서', senderLabel: '헬스장(Owner)', receiverLabel: '회원' },
};

const money = (v) => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));

// 갱신·연계 이력 테이블의 유형 표기
const HISTORY_LABEL = {
  1: '제휴',
  2: '임금',
  3: '이용권',
  4: 'PT',
  5: 'PT 체험',
};

// 계약 유형별 조항 본문
function ContractBody({ d }) {
  const gym = d.gymName ?? '헬스장';
  const rcv = d.receiverName ?? '수신자';

  if (d.contract === 1)
    return (
      <div>
        <h3>제1조 (목적)</h3>
        <p>본 계약은 관리자(플랫폼)이 제공하는 헬스장 운영·관리 플랫폼을 {gym}(이하 "가맹점")이 이용함에 있어 상호의 권리·의무를 정함을 목적으로 한다.</p>
        <h3>제2조 (수수료 및 정산)</h3>
        <p>① 가맹점은 플랫폼을 통해 발생한 매출의 {d.contractRate ?? '-'}%를 제휴 수수료로 지급한다.</p>
        <p>② 정산은 매월 지정일에 진행한다.</p>
        <h3>제3조 (계약기간)</h3>
        <p>유효기간은 {d.startDate ?? '-'}부터 {d.endDate ?? '-'}까지로 한다.</p>
        <h3>제4조 (해지 및 분쟁)</h3>
        <p>일방의 중대한 위반 시 시정 요구 후 해지할 수 있으며, 분쟁은 상호 협의하되 관할 법원에서 해결한다.</p>
      </div>
    );

  if (d.contract === 2)
    return (
      <div>
        <h3>제1조 (목적 및 근로 내용)</h3>
        <p>본 계약은 {gym}(이하 "사업주")과 {rcv}(이하 "트레이너")이 트레이너의 회원 트레이닝 등 근로 제공에 관하여 체결한다.</p>
        <h3>제2조 (임금)</h3>
        <p>월 기본급은 {money(d.amount)}만원으로 하며, 매월 지정일에 지급한다.</p>
        <h3>제3조 (인센티브)</h3>
        <p>PT 매출 등에 대한 정산(인센티브) 비율은 {d.contractRate ?? '-'}%로 한다.</p>
        <h3>제4조 (근무시간)</h3>
        <p>근무 형태 및 시간은 상호 협의하여 정하며, 협의로 조정할 수 있다.</p>
        <h3>제5조 (계약기간)</h3>
        <p>{d.startDate ?? '-'}부터 {d.endDate ?? '-'}까지로 한다.</p>
        <p>※ 근로(임금) 계약은 근로기준법상 필수 기재사항이 있으므로 실제 체결 시 노무사·변호사 검토를 권장합니다.</p>
      </div>
    );

  if (d.contract === 3)
    return (
      <div>
        <h3>제1조 (이용권 내용)</h3>
        <p>{gym}(이하 "센터")은 {rcv}(생년월일: {d.birthDate ?? '-'}, 이하 "회원")에게 헬스장 이용권을 제공하며, 이용 기간은 {d.startDate ?? '-'}부터 {d.endDate ?? '-'}까지로 한다.</p>
        <h3>제2조 (이용 요금)</h3>
        <p>이용 요금은 {money(d.amount)}만원으로 한다.</p>
        <h3>제3조 (환불 규정)</h3>
        <p>중도 해지 시 환불액은 「방문판매 등에 관한 법률」 및 센터 환불 규정에 따라 이용 개시일과 잔여 기간을 기준으로 산정한다.</p>
        <h3>제4조 (이용자 준수사항)</h3>
        <p>회원은 센터 이용 수칙 및 안전 수칙을 준수하며, 위반 시 이용이 제한될 수 있다.</p>
        <h3>제5조 (하루평균 운동 시간)</h3>
        <p>회원의 하루평균 운동 시간은 {d.avgWorkoutHour ?? 0}시간 {d.avgWorkoutMinute ?? 0}분으로 한다.</p>
      </div>
    );

  return (
    <div>
      <h3>제1조 ({d.contract === 5 ? 'PT 체험' : 'PT'} 이용 내용)</h3>
      <p>{gym}(이하 "센터")은 {rcv}(생년월일: {d.birthDate ?? '-'}, 이하 "회원")에게 {d.contract === 5 ? '체험용 개인 트레이닝(PT 체험)' : '개인 트레이닝(PT)'}을 제공한다. 총 {d.quantity ?? '-'}회, 총 이용금액 {money(d.amount)}만원으로 한다.</p>
      <h3>제2조 (유효기간)</h3>
      <p>유효기간은 {d.startDate ?? '-'}부터 {d.endDate ?? '-'}까지로 하며, 기간 경과 시 잔여 횟수는 소멸될 수 있다.</p>
      <h3>제3조 (예약 및 취소)</h3>
      <p>수업 예약·변경·취소는 센터 규정에 따르며, 사전 통지 없는 불참 시 1회가 차감될 수 있다.</p>
      <h3>제4조 (환불 규정)</h3>
      <p>중도 환불 시 기 사용 횟수 및 잔여 횟수를 기준으로 관계 법령 및 센터 규정에 따라 산정한다.</p>
      <h3>제5조 (하루평균 운동 시간)</h3>
      <p>회원의 하루평균 운동 시간은 {d.avgWorkoutHour ?? 0}시간 {d.avgWorkoutMinute ?? 0}분으로 한다.</p>
    </div>
  );
}

// 체결 완료 시 후속 처리 안내
function Activation({ d }) {
  if (d.contract === 3)
    return (
      <ul>
        <li>✓ 이용권 활성화 (ACTIVE)</li>
        <li>이용 기간: {d.startDate ?? '-'} ~ {d.endDate ?? '-'}</li>
        <li>이용 금액: {money(d.amount)}만원</li>
      </ul>
    );
  if (d.contract === 4 || d.contract === 5)
    return (
      <ul>
        <li>✓ {d.contract === 5 ? 'PT 체험' : 'PT'} 잔여 횟수 지급</li>
        <li>지급 횟수: {d.quantity ?? '-'}회</li>
        <li>잔여 횟수: {d.remainingCount ?? '-'}회 (결제 완료·활성화 시 자동 생성)</li>
        <li>유효기간: {d.startDate ?? '-'} ~ {d.endDate ?? '-'}</li>
      </ul>
    );
  if (d.contract === 2)
    return (
      <ul>
        <li>✓ 트레이너 정산 정보 등록</li>
        <li>월 기본급: {money(d.amount)}만원</li>
        <li>인센티브 비율: {d.contractRate ?? '-'}%</li>
      </ul>
    );
  return (
    <ul>
      <li>✓ 제휴 계약 발효</li>
      <li>가맹점: {d.gymName ?? '-'}</li>
      <li>수수료율: {d.contractRate ?? '-'}%</li>
    </ul>
  );
}

// 계약서 상세 및 서명 페이지
function ContractDetail() {
  const { dataId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 로그인 사용자 파싱 예외 방지
  const getLoginUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };
  const loginUser = getLoginUser();
  const isAdmin = loginUser?.role?.toUpperCase() === 'ADMIN';

  // 서명폼 상태
  const [signerName, setSignerName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [agreeSign, setAgreeSign] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  const abortControllerRef = useRef(null);

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 계약서 상세 조회
  const fetchDetail = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${dataId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (response.ok) {
        setDetail(await response.json());
        setMessage('');
      } else {
        setMessage(`조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('상세 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    }
  }, [dataId]);

  useEffect(() => {
    fetchDetail();
    return () => cancelPendingRequests();
  }, [fetchDetail]);

  // 갱신·연계 이력
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!detail) return;

    let isMounted = true;
    const controller = new AbortController();

    const buildHistory = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const rows = [];
      const fetchOne = async (id) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          return res.ok ? res.json() : null;
        } catch {
          return null;
        }
      };

      let prevId = detail.previousDataId;
      let guard = 0;
      while (prevId && guard < 5) {
        const prev = await fetchOne(prevId);
        if (!prev) break;
        rows.push({ kind: '갱신(이전 계약)', row: prev });
        prevId = prev.previousDataId;
        guard += 1;
      }

      if (detail.relatedDataId) {
        const related = await fetchOne(detail.relatedDataId);
        if (related) rows.push({ kind: '연계(기본 계약)', row: related });
      }

      if (isMounted) {
        setHistory(rows);
      }
    };

    buildHistory();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [detail]);

  // 서명 패드그리기 이벤트
  const getPos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };

  const padDown = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };

  const padMove = (e) => {
    if (!drawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastRef.current = pos;
    setHasInk(true);
  };

  const padUp = () => {
    drawingRef.current = false;
  };

  const padClear = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const needRefund = detail?.contract === 3 || detail?.contract === 4 || detail?.contract === 5;
  const canSign =
    signerName.trim() !== '' &&
    agreeTerms &&
    agreeSign &&
    (!needRefund || agreeRefund) &&
    hasInk &&
    !submitting;

  // 서명 제출
  const handleSign = async () => {
    if (!canSign) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/contract/detail/${dataId}/sign`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        alert('서명이 완료되어 계약이 체결되었습니다. (상태: SIGNED)');
        if (detail?.contract === 3 || detail?.contract === 4 || detail?.contract === 5) {
          navigate(`/fitb/payment/${dataId}`);
        } else {
          fetchDetail();
        }
      } else {
        setMessage(`서명 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('서명 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div>
        <h1>계약서 상세</h1>
        <p>{message || '불러오는 중...'}</p>
        <button type="button" onClick={() => navigate('/fitb/contractpage')}>
          리스트로 돌아가기
        </button>
      </div>
    );
  }

  const info = TYPE_INFO[detail.contract] ?? { title: '계약서', senderLabel: '발행자', receiverLabel: '수신자' };

  return (
    <div>
      <style>{'@media print { .no-print { display: none; } }'}</style>

      <div className="no-print">
        <button type="button" onClick={() => navigate('/fitb/contractpage')}>
          ← 리스트로
        </button>
        <p>{message}</p>

        <p>
          상태: <b>{detail.status}</b>
          {' '}
          (
          {['DRAFT', 'ISSUED', 'SIGNED', 'ACTIVE', 'TERMINATED'].map((s, i) => (
            <span key={s}>
              {i > 0 && ' › '}
              {s === detail.status ? <b>[{s}]</b> : s}
            </span>
          ))}
          )
        </p>

        {history.length > 0 && (
          <div>
            <h3>갱신·연계 이력</h3>
            <table border="1">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>유형</th>
                  <th>금액(만원)</th>
                  <th>발행일</th>
                  <th>이동</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ kind, row }) => (
                  <tr key={row.dataId}>
                    <td>{kind}</td>
                    <td>{HISTORY_LABEL[row.contract] ?? row.contract}</td>
                    <td>{row.contract === 1 ? (row.contractRate != null ? `${row.contractRate}%` : '') : row.amount}</td>
                    <td>{row.issueDate}</td>
                    <td>
                      <button type="button" onClick={() => navigate(`/fitb/contract/${row.dataId}`)}>
                        #{row.dataId}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <hr />
      <h1>{info.title}</h1>
      <p>
        {detail.contract === 1 ? info.senderLabel : detail.gymName ?? info.senderLabel}
        (이하 "발행자")과 {detail.receiverName ?? '수신자'}(이하 "수신자")은 아래와 같이 계약을 체결한다.
      </p>
      <ContractBody d={detail} />
      <p>계약 발행일: {detail.issueDate ?? '-'}</p>

      <table border="1">
        <thead>
          <tr>
            <th>{info.senderLabel}</th>
            <th>{info.receiverLabel}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {detail.contract === 1 ? '관리자(플랫폼)' : detail.gymName ?? '-'} (인)
              <br />전자서명 완료 · {detail.issueDate ?? '-'}
            </td>
            <td>
              {detail.receiverName ?? '-'} (인)
              <br />
              {detail.signedAt
                ? `전자서명 완료 · ${detail.signedAt.replace('T', ' ')}`
                : '서명 대기 중'}
            </td>
          </tr>
        </tbody>
      </table>
      <hr className="no-print" />

      {detail.status === 'ISSUED' && detail.contract === 1 && isAdmin && (
        <p className="no-print">수신자(사장님) 서명 대기 중입니다.</p>
      )}

      {detail.status === 'ISSUED' && !(detail.contract === 1 && isAdmin) && (
        <div className="no-print">
          <h2>수신자 서명</h2>
          <p>아래 동의 항목을 확인하고 서명하시면 계약이 체결됩니다. 모바일에서는 손가락으로 서명할 수 있습니다.</p>

          <div>
            <label htmlFor="signer-name-input">서명자 성명: </label>
            <input
              id="signer-name-input"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="성명"
            />
          </div>

          <div>
            <div>
              <label>
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                위 계약서의 모든 조항을 확인하였으며 그 내용에 동의합니다. (필수)
              </label>
            </div>
            {needRefund && (
              <div>
                <label>
                  <input type="checkbox" checked={agreeRefund} onChange={(e) => setAgreeRefund(e.target.checked)} />
                  환불 규정을 확인하였으며 이에 동의합니다. (필수)
                </label>
              </div>
            )}
            <div>
              <label>
                <input type="checkbox" checked={agreeSign} onChange={(e) => setAgreeSign(e.target.checked)} />
                전자적 방식으로 서명함에 동의합니다. (필수)
              </label>
            </div>
          </div>

          <div>
            <p>서명란 (마우스·손가락으로 서명하세요)</p>
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              style={{ border: '1px solid black', touchAction: 'none' }}
              onPointerDown={padDown}
              onPointerMove={padMove}
              onPointerUp={padUp}
              onPointerLeave={padUp}
            />
            <div>
              <button type="button" onClick={padClear}>지우기</button>
            </div>
          </div>

          <button type="button" onClick={handleSign} disabled={!canSign}>
            {submitting ? '처리 중...' : '서명하고 계약 체결'}
          </button>
        </div>
      )}

      {(detail.status === 'SIGNED' || detail.status === 'ACTIVE') && (
        <div className="no-print">
          <h2>계약 체결 완료</h2>
          <p>서명일시: {detail.signedAt?.replace('T', ' ') ?? '-'}</p>
          {detail.status === 'SIGNED' && (detail.contract === 3 || detail.contract === 4 || detail.contract === 5) && (
            <p>
              결제 대기 중입니다.{' '}
              <button type="button" onClick={() => navigate(`/fitb/payment/${detail.dataId}`)}>
                결제 페이지로 이동
              </button>
            </p>
          )}
          <Activation d={detail} />

          <button type="button" onClick={() => window.print()}>
            서명본 PDF로 보관 / 인쇄
          </button>
        </div>
      )}

      {detail.status === 'DRAFT' && <p className="no-print">아직 발행되지 않은 초안(DRAFT) 상태로, 서명할 수 없습니다.</p>}
      {detail.status === 'TERMINATED' && <p className="no-print">종료(TERMINATED)된 계약서입니다.</p>}
    </div>
  );
}

export default ContractDetail;
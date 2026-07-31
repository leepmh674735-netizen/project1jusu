import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './Payment.css';

// 계약 유형 라벨 (백엔드 h_contract_data.contract 코드 기준)
const TYPE_LABEL = { 3: '이용권', 4: 'PT', 5: 'PT 체험' };

// 횟수(quantity)를 갖는 PT형 계약
const PT_CONTRACTS = [4, 5];

const money = (v) => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));

function Payment() {
  const { dataId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [installment, setInstallment] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${dataId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDetail(data);
        if (data.receiverId) {
          fetchCoupons(data.receiverId);
        }
      } else if (response.status === 401) {
        alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      } else {
        setMessage(`계약 조회 실패 (${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('계약 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const fetchCoupons = async (memberUsername) => {
    const token = localStorage.getItem('accessToken');
    if (!token || !memberUsername) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/tolist?username=${memberUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCoupons(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataId]);

  // 쿠폰 카테고리별 적용 규칙
  const COUPON_CATEGORY_RULES = {
    '헬스': (c, d) => d.contract === 3,
    'PT': (c, d) => d.contract === 4,
    '체험권': (c, d) => PT_CONTRACTS.includes(d.contract),
  };

  // 이 계약에 적용 가능한 쿠폰 필터링
  const applicableCoupons = (() => {
    if (!detail) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return coupons.filter((c) => {
      if (c.status !== '미사용') return false;
      if (!c.date || new Date(c.date) < today) return false;
      if (c.gymId !== detail.gymId) return false;
      const rule = COUPON_CATEGORY_RULES[c.category];
      return rule ? rule(c, detail) : false;
    });
  })();

  const selectedCoupon = applicableCoupons.find((c) => String(c.couponId) === String(selectedCouponId)) || null;
  
  // 할인 금액 계산 (최대 금액 Capping 적용 및 음수 방지)
  const rawDiscount = selectedCoupon ? Math.floor((detail?.amount || 0) * selectedCoupon.percent / 100) : 0;
  const isCapped = selectedCoupon?.maxAmount != null && rawDiscount > selectedCoupon.maxAmount;
  const discount = isCapped ? selectedCoupon.maxAmount : rawDiscount;
  const finalPrice = Math.max(0, (detail?.amount || 0) - discount);
  const effectiveInstallment = finalPrice === 0 ? 0 : installment;

  const handleCheckout = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/payment/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataId: Number(dataId),
          couponId: selectedCouponId ? Number(selectedCouponId) : null,
          installment: effectiveInstallment,
        }),
      });

      if (response.ok) {
        alert('결제가 정상적으로 완료되었습니다.');
        navigate(`/fitb/contract/${dataId}`);
      } else {
        const errText = await response.text();
        setMessage(`결제 실패: ${errText}`);
      }
    } catch (error) {
      console.error('결제 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div className="pay-state">
        <div className="pay-state-title">결제</div>
        <p>{message || '계약 정보를 불러오는 중입니다...'}</p>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <div className="pay-head">
        <h1 className="pay-title">결제</h1>
        <Link to={`/fitb/contract/${dataId}`} className="pay-back">← 계약 상세로</Link>
      </div>

      <div className="pay-layout">
        {/* 본문: 계약 정보 · 쿠폰 · 결제 방법 */}
        <div className="pay-main">
          <section className="pay-card">
            <h2 className="pay-card-title">계약 정보</h2>
            <div className="pay-fields">
              <div className="pay-field">
                <span className="pay-field-label">계약 유형</span>
                <span className="pay-field-value">
                  <span className="pay-type-badge">{TYPE_LABEL[detail.contract] ?? '-'}</span>
                </span>
              </div>
              <div className="pay-field">
                <span className="pay-field-label">계약 기간</span>
                <span className="pay-field-value">{detail.startDate ?? '-'} ~ {detail.endDate ?? '-'}</span>
              </div>
              {PT_CONTRACTS.includes(detail.contract) && (
                <div className="pay-field">
                  <span className="pay-field-label">PT 횟수</span>
                  <span className="pay-field-value">{detail.quantity ?? '-'}회</span>
                </div>
              )}
              <div className="pay-field">
                <span className="pay-field-label">결제 금액</span>
                <span className="pay-field-value is-amount">{money(detail.amount)}원</span>
              </div>
            </div>
          </section>

          <section className="pay-card">
            <h2 className="pay-card-title">쿠폰 선택</h2>
            {applicableCoupons.length === 0 ? (
              <p className="pay-coupon-none">이 계약에 적용 가능한 쿠폰이 없습니다.</p>
            ) : (
              <div className="pay-coupon-list">
                <label className={`pay-coupon-option${selectedCouponId === null ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="coupon"
                    className="pay-coupon-radio"
                    checked={selectedCouponId === null}
                    onChange={() => setSelectedCouponId(null)}
                  />
                  <span className="pay-coupon-body">
                    <span className="pay-coupon-name">쿠폰 사용 안 함</span>
                  </span>
                </label>
                {applicableCoupons.map((c) => (
                  <label
                    key={c.couponId}
                    className={`pay-coupon-option${selectedCouponId === c.couponId ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="coupon"
                      className="pay-coupon-radio"
                      checked={selectedCouponId === c.couponId}
                      onChange={() => setSelectedCouponId(c.couponId)}
                    />
                    <span className="pay-coupon-body">
                      <span className="pay-coupon-name">
                        <span className="pay-coupon-cat">{c.category}</span>
                        {c.couponName}
                      </span>
                      <span className="pay-coupon-meta">
                        {c.category === '체험권' ? '무료체험' : `${c.percent}% 할인`}
                        {c.maxAmount != null ? ` · 최대 ${money(c.maxAmount)}원` : ''} · {c.fromName || '지점'} 발송 · ~{c.date} 까지
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="pay-card">
            <h2 className="pay-card-title">결제 방법</h2>
            <div className="pay-method-row">
              <label className="pay-field-label" htmlFor="pay-installment">할부 개월</label>
              <select
                id="pay-installment"
                className="pay-select"
                value={effectiveInstallment}
                disabled={finalPrice === 0}
                onChange={(e) => setInstallment(Number(e.target.value))}
              >
                <option value={0}>일시불</option>
                <option value={3}>3개월 할부</option>
                <option value={6}>6개월 할부</option>
                <option value={12}>12개월 할부</option>
              </select>
              {finalPrice === 0 && (
                <p className="pay-method-note">무료(0원) 결제는 일시불로 처리됩니다.</p>
              )}
            </div>
          </section>
        </div>

        {/* 우측 요약 레일 */}
        <aside className="pay-summary">
          <h2 className="pay-summary-title">결제 요약</h2>
          <div className="pay-summary-row">
            <span>기본 금액</span>
            <span className="pay-summary-num">{money(detail.amount)}원</span>
          </div>
          {selectedCoupon && (
            <div className="pay-summary-row is-discount">
              <span>
                쿠폰 할인{selectedCoupon.category === '체험권' ? ' (무료체험)' : ''}
                {isCapped ? ` (최대 ${money(selectedCoupon.maxAmount)}원)` : ''}
              </span>
              <span className="pay-summary-num">-{money(discount)}원</span>
            </div>
          )}
          <div className="pay-summary-row">
            <span>결제 방법</span>
            <span className="pay-summary-num">{effectiveInstallment === 0 ? '일시불' : `${effectiveInstallment}개월 할부`}</span>
          </div>

          <div className="pay-summary-divider" />

          <div className="pay-summary-total">
            <span className="pay-summary-total-label">최종 결제 금액</span>
            <span className="pay-summary-total-value">{money(finalPrice)}원</span>
          </div>

          <button
            type="button"
            className="pay-submit"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? '결제 처리 중...' : '결제하기'}
          </button>

          {message && <p className="pay-message">{message}</p>}
        </aside>
      </div>
    </div>
  );
}

export default Payment;
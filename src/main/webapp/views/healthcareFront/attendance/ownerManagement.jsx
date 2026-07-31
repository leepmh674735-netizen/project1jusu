import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import ClientPagination from '../components/ClientPagination';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티

const PAGE_SIZE = 10;

const getLastPage = (itemCount) => Math.max(1, Math.ceil(itemCount / PAGE_SIZE));

const getPageItems = (items, page) => {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
};

// 날짜 차이(D-day) 계산 안전 헬퍼
const calculateDday = (targetDateStr) => {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr.substring(0, 10));
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
};

function OwnerManagement({ onGoPromotion, gymId }) {
  const [members, setMembers] = useState([]);
  const [payCouponMap, setPayCouponMap] = useState(null);
  const [payCouponStatus, setPayCouponStatus] = useState('loading');
  const [trainers, setTrainers] = useState([]);
  const [rebooks, setRebooks] = useState([]);
  const [activeTab, setActiveTab] = useState('members');
  const [memberPage, setMemberPage] = useState(1);
  const [trainerPage, setTrainerPage] = useState(1);
  const [rebookPage, setRebookPage] = useState(1);

  const contractLabel = { 3: '이용권', 4: 'PT', 5: 'PT 체험' };
  const abortControllerRef = useRef(null);

  const cancelPendingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 1. 지점 개요 (트레이너 성과 & 재등록 대상) 조회
  const fetchOverview = useCallback(async (resetPage = false, signal) => {
    if (resetPage) {
      setTrainerPage(1);
      setRebookPage(1);
    }

    try {
      const query = gymId ? `?gymId=${gymId}` : '';
      const response = await fetchWithToken(
        `${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/owner/overview${query}`,
        { signal }
      );
      if (response.ok) {
        const data = await response.json();
        const nextTrainers = data.trainers || [];
        const nextRebooks = data.rebooks || [];
        setTrainers(nextTrainers);
        setRebooks(nextRebooks);
        setTrainerPage((currentPage) => Math.min(currentPage, getLastPage(nextTrainers.length)));
        setRebookPage((currentPage) => Math.min(currentPage, getLastPage(nextRebooks.length)));
      } else {
        console.error('지점 현황 로드 실패:', await response.text());
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('지점 현황 조회 실패:', error);
      }
    }
  }, [gymId]);

  // 2. 활성 회원 명단 조회
  const fetchMembers = useCallback(async (resetPage = false, signal) => {
    if (resetPage) {
      setMemberPage(1);
    }

    try {
      const query = gymId ? `?gymId=${gymId}` : '';
      const response = await fetchWithToken(
        `${import.meta.env.VITE_BACKEND_URL}/contract/roster${query}`,
        { signal }
      );
      if (response.ok) {
        const data = await response.json();
        const activeMembers = (data || []).filter(
          (r) => String(r.member?.role || '').toUpperCase() === 'MEMBER' && r.status === 'ACTIVE'
        );
        setMembers(activeMembers);
        setMemberPage((currentPage) => Math.min(currentPage, getLastPage(activeMembers.length)));
      } else {
        console.error('회원 명단 로드 실패:', await response.text());
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('회원 명단 조회 실패:', error);
      }
    }
  }, [gymId]);

  // 3. 결제 쿠폰 사용 매핑 정보 조회
  const fetchContractCoupons = useCallback(async (signal) => {
    setPayCouponMap(null);
    setPayCouponStatus('loading');
    try {
      const response = await fetchWithToken(
        `${import.meta.env.VITE_BACKEND_URL}/fitb/payment/paylist/export`,
        { signal }
      );
      if (response.ok) {
        const data = await response.json();
        const map = {};
        (data || []).forEach((p) => {
          if (p.dataId != null) map[String(p.dataId)] = p;
        });
        setPayCouponMap(map);
        setPayCouponStatus('loaded');
      } else {
        console.error('결제 내역 로드 실패:', await response.text());
        setPayCouponStatus('error');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('결제 내역 조회 실패:', error);
        setPayCouponStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchOverview(true, controller.signal);
    fetchMembers(true, controller.signal);
    fetchContractCoupons(controller.signal);

    return () => cancelPendingRequest();
  }, [gymId, fetchOverview, fetchMembers, fetchContractCoupons]);

  const tabs = [
    { key: 'members', label: `회원 (${members.length})` },
    { key: 'trainers', label: '트레이너 성과' },
    { key: 'rebooks', label: `재등록 임박 (${rebooks.length})` },
  ];

  const memberPageItems = getPageItems(members, memberPage);
  const trainerPageItems = getPageItems(trainers, trainerPage);
  const rebookPageItems = getPageItems(rebooks, rebookPage);

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '20px' }}>

      {/* ===== 탭바 ===== */}
      <div role="tablist" aria-label="지점 관리 메뉴" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-controls={`panel-${tab.key}`}
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
              borderRadius: '999px', border: '1px solid ' + (activeTab === tab.key ? '#171717' : '#d4d4d4'),
              backgroundColor: activeTab === tab.key ? '#171717' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#525252',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 0. 회원 (ACTIVE 계약 보유 회원 명단) ===== */}
      {activeTab === 'members' && (
        <div id="panel-members" role="tabpanel" aria-labelledby="tab-members">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>👥 회원 명단</h3>
            <button onClick={() => { fetchMembers(); fetchContractCoupons(); }} style={{ padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
              🔄 새로고침
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 15px 0' }}>
            현재 이용 중(ACTIVE)인 이용권·PT 계약을 보유한 회원입니다. 쿠폰 사용여부는 해당 계약 결제 시 쿠폰 적용 여부입니다.
          </p>

          {members.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
              이용 중인 회원이 없습니다.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약유형</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>종료일</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>쿠폰 사용여부</th>
                </tr>
              </thead>
              <tbody>
                {memberPageItems.map((m) => {
                  const dday = calculateDday(m.endDate);
                  const pay = payCouponMap?.[String(m.dataId)];
                  const couponUsed = pay?.couponId != null;
                  return (
                    <tr key={m.dataId ?? m.member?.username}>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>{m.member?.name ?? '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{m.member?.username ?? '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {m.dataId != null ? (
                          <Link to={`/fitb/contract/${m.dataId}`} style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}>
                            {contractLabel[m.contract] ?? '-'}
                          </Link>
                        ) : (
                          contractLabel[m.contract] ?? '-'
                        )}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {m.endDate ? <>{m.endDate}{dday != null && <span style={{ fontSize: '11px', color: dday <= 7 ? '#b91c1c' : '#888' }}> (D-{dday})</span>}</> : '-'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {payCouponStatus === 'error' ? (
                          <span style={{ color: '#b91c1c' }}>확인 불가</span>
                        ) : payCouponMap === null ? (
                          <span style={{ color: '#999' }}>확인 중</span>
                        ) : !pay ? (
                          <span style={{ color: '#999' }}>결제 내역 없음</span>
                        ) : couponUsed ? (
                          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>사용</span>
                            {pay.couponName && <span style={{ fontSize: '11px', color: '#666' }}>{pay.couponName}</span>}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', backgroundColor: '#f5f5f4', color: '#525252', border: '1px solid #e5e5e5', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>미사용</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <ClientPagination
            currentPage={memberPage}
            totalItems={members.length}
            pageSize={PAGE_SIZE}
            onPageChange={setMemberPage}
            ariaLabel="회원 명단 페이지"
          />
        </div>
      )}

      {/* ===== 1. 트레이너별 성과 보드 ===== */}
      {activeTab === 'trainers' && (
        <div id="panel-trainers" role="tabpanel" aria-labelledby="tab-trainers">
          <h3>🏋️ 트레이너별 성과</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
            우리 지점 트레이너의 담당 회원 수와 이번 달 수업 실적입니다. 수행률 = 완료 / (완료 + 미수행).
          </p>

          <button onClick={() => fetchOverview()} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
            🔄 새로고침
          </button>

          {trainers.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
              지점에 소속된 트레이너가 없습니다.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>트레이너</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 회원</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>이번 달 수업</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>수행률</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>재등록 임박</th>
                </tr>
              </thead>
              <tbody>
                {trainerPageItems.map((trainer) => {
                  const done = trainer.monthDone || 0;
                  const missed = trainer.monthMissed || 0;
                  const rate = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;
                  return (
                    <tr key={trainer.username}>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>
                        {trainer.name}<br /><span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }}>{trainer.username}</span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{trainer.memberCount || 0}명</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {done}건{missed > 0 && <span style={{ fontSize: '11px', color: '#b91c1c' }}> (미수행 {missed})</span>}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: rate == null ? '#999' : rate >= 90 ? '#15803d' : rate >= 70 ? '#d97706' : '#b91c1c' }}>
                        {rate != null ? `${rate}%` : '-'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {(trainer.rebookCount || 0) > 0 ? (
                          <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{trainer.rebookCount}명</span>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <ClientPagination
            currentPage={trainerPage}
            totalItems={trainers.length}
            pageSize={PAGE_SIZE}
            onPageChange={setTrainerPage}
            ariaLabel="트레이너 성과 페이지"
          />
        </div>
      )}

      {/* ===== 2. 재등록 임박 리스트 (PT + 이용권) ===== */}
      {activeTab === 'rebooks' && (
        <div id="panel-rebooks" role="tabpanel" aria-labelledby="tab-rebooks">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>⏰ 재등록 임박 회원</h3>
            <button onClick={() => onGoPromotion && onGoPromotion()}
              style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#f59e0b', color: '#fff' }}>
              🎟️ 프로모션(쿠폰) 발행하러 가기
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 15px 0' }}>
            PT 잔여 3회 이하 또는 이용권 종료 7일 이내인 회원입니다. 쿠폰 발행으로 재등록을 유도해 보세요.
          </p>

          {rebooks.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
              재등록 임박 회원이 없습니다.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>구분</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 트레이너</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>남은 상태</th>
                </tr>
              </thead>
              <tbody>
                {rebookPageItems.map((rebook, index) => {
                  const isPt = rebook.remainingCount != null;
                  const dday = calculateDday(rebook.endDate);
                  return (
                    <tr key={`${rebook.category}-${rebook.dataId ?? index}`}>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', backgroundColor: isPt ? '#7c3aed' : '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                          {rebook.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>{rebook.memberName || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.username}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.trainerName || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#d97706' }}>
                        {isPt
                          ? `잔여 ${rebook.remainingCount}회`
                          : `종료 ${rebook.endDate} (D-${dday})`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <ClientPagination
            currentPage={rebookPage}
            totalItems={rebooks.length}
            pageSize={PAGE_SIZE}
            onPageChange={setRebookPage}
            ariaLabel="재등록 임박 회원 페이지"
          />
        </div>
      )}

    </div>
  );
}

export default OwnerManagement;
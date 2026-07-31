import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티
import './AdminManagement.css';

const DAY_MS = 24 * 60 * 60 * 1000;

// 날짜 파싱 안정화: 타임존 영향을 받지 않고 년/월/일만 정확히 비교
const calcDaysLeft = (endDate) => {
  if (!endDate) return null;

  const parts = String(endDate).split('-');
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(year, month - 1, day);
  end.setHours(0, 0, 0, 0);

  return Math.round((end - today) / DAY_MS);
};

const getExpiryMeta = (endDate) => {
  const daysLeft = calcDaysLeft(endDate);

  if (daysLeft === null) return { label: '기간 미정', level: 'none' };
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}일 경과`, level: 'expired' };
  if (daysLeft === 0) return { label: '오늘 만료', level: 'expired' };
  if (daysLeft <= 30) return { label: `D-${daysLeft}`, level: 'soon' };
  if (daysLeft <= 90) return { label: `D-${daysLeft}`, level: 'watch' };
  return { label: `D-${daysLeft}`, level: 'normal' };
};

const STATUS_LABEL = {
  DRAFT: '작성 중',
  ISSUED: '서명 대기',
  SIGNED: '계약 중',
  EXPIRED: '만료',
  ACTIVE: '이용 중',
  TERMINATED: '종료',
};

const CONTRACT_LABEL = {
  1: '제휴',
  2: '임금',
  3: '이용권',
  4: 'PT',
  5: 'PT 체험',
};

function AdminManagement() {
  const [activeTab, setActiveTab] = useState('contracts');

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedGym, setSelectedGym] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');

  const [jobSeekers, setJobSeekers] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState('');
  const [jobLoaded, setJobLoaded] = useState(false);

  // 검색어 상태
  const [searchTerm, setSearchTerm] = useState('');

  // 진행 중인 fetch 요청 취소용 Controller Ref
  const abortControllerRef = useRef(null);

  const cancelPendingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 1. 운동시설 제휴 계약 목록 조회 (fetchWithToken 연동)
  const fetchContracts = useCallback(async () => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/contract/roster`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setError(`계약 현황을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      const data = await response.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      if (fetchError.name !== 'AbortError') {
        console.error('운동시설 계약 현황 조회 실패:', fetchError);
        setError('서버와 통신 중 오류가 발생했습니다.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchContracts();
    return () => cancelPendingRequest();
  }, [fetchContracts]);

  // 2. 특정 지점 회원 명단 조회 (fetchWithToken 연동)
  const fetchMembers = useCallback(async (gymId) => {
    if (!gymId) return;

    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMembersLoading(true);
    setMembersError('');
    setMembers([]);

    try {
      const params = new URLSearchParams({ gymId: String(gymId) });
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/contract/roster?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setMembersError(`회원 명단을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      const roster = await response.json();
      if (Array.isArray(roster)) {
        setMembers(roster.filter((item) => item.member?.role?.toLowerCase() === 'member'));
      }
    } catch (fetchError) {
      if (fetchError.name !== 'AbortError') {
        console.error('운동시설 회원 명단 조회 실패:', fetchError);
        setMembersError('서버와 통신 중 오류가 발생했습니다.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setMembersLoading(false);
      }
    }
  }, []);

  // 3. 구직 트레이너 목록 조회 (fetchWithToken 연동)
  const fetchJobSeekers = useCallback(async () => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setJobLoading(true);
    setJobError('');

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/contract/jobseekers`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        setJobError(`구직 트레이너 명단을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      const data = await response.json();
      setJobSeekers(Array.isArray(data) ? data : []);
      setJobLoaded(true);
    } catch (fetchError) {
      if (fetchError.name !== 'AbortError') {
        console.error('구직 트레이너 조회 실패:', fetchError);
        setJobError('서버와 통신 중 오류가 발생했습니다.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setJobLoading(false);
      }
    }
  }, []);

  const handleSelectTab = (tab) => {
    setSearchTerm('');
    setActiveTab(tab);
    if (tab === 'jobseekers' && !jobLoaded) {
      fetchJobSeekers();
    }
  };

  const handleSelectGym = (contract) => {
    setSearchTerm('');
    setSelectedGym({
      gymId: contract.gymId,
      gymName: contract.gymName || `운동시설 #${contract.gymId}`,
    });
    fetchMembers(contract.gymId);
  };

  const handleBackToGyms = () => {
    setSearchTerm('');
    setSelectedGym(null);
    setMembers([]);
    setMembersError('');
  };

  const summary = useMemo(() => contracts.reduce((counts, contract) => {
    const daysLeft = calcDaysLeft(contract.endDate);
    const isExpired = contract.status === 'EXPIRED' || contract.status === 'TERMINATED' || (daysLeft !== null && daysLeft < 0);
    if (isExpired) counts.expired += 1;
    else if (daysLeft !== null && daysLeft <= 30) counts.expiring += 1;
    else counts.normal += 1;
    return counts;
  }, { normal: 0, expiring: 0, expired: 0 }), [contracts]);

  // 검색 필터링된 데이터
  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts;
    const term = searchTerm.toLowerCase();
    return contracts.filter((c) => (
      (c.gymName && c.gymName.toLowerCase().includes(term)) ||
      (c.member?.name && c.member.name.toLowerCase().includes(term))
    ));
  }, [contracts, searchTerm]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter((m) => (
      (m.member?.name && m.member.name.toLowerCase().includes(term)) ||
      (m.member?.username && String(m.member.username).toLowerCase().includes(term))
    ));
  }, [members, searchTerm]);

  const filteredJobSeekers = useMemo(() => {
    if (!searchTerm.trim()) return jobSeekers;
    const term = searchTerm.toLowerCase();
    return jobSeekers.filter((j) => (
      (j.name && j.name.toLowerCase().includes(term)) ||
      (j.username && String(j.username).toLowerCase().includes(term))
    ));
  }, [jobSeekers, searchTerm]);

  // ── 회원 명단 뷰 ─────────────────────────────
  const renderMemberView = () => (
    <>
      <div className="admin-management__header">
        <div>
          <button type="button" className="admin-management__back" onClick={handleBackToGyms}>
            ← 운동시설 목록으로
          </button>
          <h3 className="admin-management__title">{selectedGym.gymName} 회원 명단</h3>
          <p className="admin-management__desc">해당 운동시설에 등록된 회원을 확인합니다.</p>
        </div>
        <button
          type="button"
          className="admin-management__refresh"
          onClick={() => fetchMembers(selectedGym.gymId)}
          disabled={membersLoading}
        >
          {membersLoading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      <div className="admin-management__filter-bar">
        <input
          type="search"
          placeholder="회원 이름 또는 연락처(아이디) 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-management__search-input"
        />
      </div>

      {membersError && <p className="admin-management__error">{membersError}</p>}

      {!membersLoading && !membersError && filteredMembers.length === 0 ? (
        <p className="admin-management__empty">
          {searchTerm ? '검색 결과와 일치하는 회원이 없습니다.' : '이 운동시설에 등록된 회원이 없습니다.'}
        </p>
      ) : !membersError && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>아이디(연락처)</th>
                <th>이름</th>
                <th>계약 유형</th>
                <th>계약 상태</th>
                <th>계약 기간</th>
                <th>만료까지</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((item) => {
                const expiry = getExpiryMeta(item.endDate);
                return (
                  <tr key={item.member?.username ?? item.dataId}>
                    <td>{item.member?.username ?? '-'}</td>
                    <td className="admin-management__cell--name">{item.member?.name ?? '-'}</td>
                    <td className="admin-management__cell--center">
                      {item.contract ? (CONTRACT_LABEL[item.contract] ?? item.contract) : '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {STATUS_LABEL[item.status] || item.status || '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {item.startDate ? `${item.startDate} ~ ${item.endDate}` : '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      <span className={`admin-management__badge admin-management__badge--${expiry.level}`}>
                        {expiry.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ── 운동시설 제휴 계약 현황 뷰 ─────────────────────
  const renderGymList = () => (
    <>
      <div className="admin-management__header">
        <div>
          <h3 className="admin-management__title">운동시설 제휴 계약 현황</h3>
          <p className="admin-management__desc">
            각 운동시설과의 계약 기간을 확인하고, 만료 30일 전부터 갱신을 준비할 수 있습니다.
            운동시설명을 누르면 해당 시설의 회원 명단을 볼 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          className="admin-management__refresh"
          onClick={fetchContracts}
          disabled={loading}
        >
          {loading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      <div className="admin-management__summary">
        <div className="admin-management__summary-card admin-management__summary-card--normal">
          <div className="admin-management__summary-label">정상</div>
          <strong className="admin-management__summary-value">{summary.normal}</strong>건
        </div>
        <div className="admin-management__summary-card admin-management__summary-card--expiring">
          <div className="admin-management__summary-label">30일 이내 만료</div>
          <strong className="admin-management__summary-value">{summary.expiring}</strong>건
        </div>
        <div className="admin-management__summary-card admin-management__summary-card--expired">
          <div className="admin-management__summary-label">만료</div>
          <strong className="admin-management__summary-value">{summary.expired}</strong>건
        </div>
      </div>

      <div className="admin-management__filter-bar">
        <input
          type="search"
          placeholder="운동시설명 또는 대표자명 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-management__search-input"
        />
      </div>

      {error && <p className="admin-management__error">{error}</p>}

      {!loading && !error && filteredContracts.length === 0 ? (
        <p className="admin-management__empty">
          {searchTerm ? '검색 결과와 일치하는 운동시설이 없습니다.' : '등록된 제휴 계약이 없습니다.'}
        </p>
      ) : !error && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>운동시설</th>
                <th>대표자</th>
                <th>계약 상태</th>
                <th>계약 시작일</th>
                <th>계약 종료일</th>
                <th>만료까지</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const expiry = getExpiryMeta(contract.endDate);
                return (
                  <tr key={contract.dataId}>
                    <td className="admin-management__cell--gym">
                      <button
                        type="button"
                        className="admin-management__gym-link"
                        onClick={() => handleSelectGym(contract)}
                        disabled={contract.gymId == null}
                      >
                        {contract.gymName || `운동시설 #${contract.gymId}`}
                      </button>
                    </td>
                    <td className="admin-management__cell--center">
                      {contract.member?.name || contract.receiverName || '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {STATUS_LABEL[contract.status] || contract.status || '-'}
                    </td>
                    <td className="admin-management__cell--center">{contract.startDate || '-'}</td>
                    <td className="admin-management__cell--center">{contract.endDate || '-'}</td>
                    <td className="admin-management__cell--center">
                      <span className={`admin-management__badge admin-management__badge--${expiry.level}`}>
                        {expiry.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ── 구인구직 뷰 ──────────────────────────────
  const renderJobSeekers = () => (
    <>
      <div className="admin-management__header">
        <div>
          <h3 className="admin-management__title">구직 트레이너</h3>
          <p className="admin-management__desc">
            유효한 임금 계약이 없는(이탈) 트레이너 명단입니다. 사장님에게는 아래 연락처만
            소개(제공)하며, 이후 접촉·채용은 사장님이 직접 진행합니다.
          </p>
        </div>
        <button
          type="button"
          className="admin-management__refresh"
          onClick={fetchJobSeekers}
          disabled={jobLoading}
        >
          {jobLoading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      <div className="admin-management__filter-bar">
        <input
          type="search"
          placeholder="트레이너 이름 또는 전화번호 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-management__search-input"
        />
      </div>

      {jobError && <p className="admin-management__error">{jobError}</p>}

      {!jobLoading && !jobError && filteredJobSeekers.length === 0 ? (
        <p className="admin-management__empty">
          {searchTerm ? '검색 결과와 일치하는 트레이너가 없습니다.' : '현재 구직 중인 트레이너가 없습니다.'}
        </p>
      ) : !jobError && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>이름</th>
                <th>전화번호(아이디)</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobSeekers.map((trainer) => (
                <tr key={trainer.username}>
                  <td className="admin-management__cell--name">{trainer.name}</td>
                  <td>{trainer.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="admin-management">
      <div className="admin-management__tabs" role="tablist" aria-label="회원 및 계약 관리">
        <button
          id="tab-contracts"
          type="button"
          role="tab"
          aria-controls="panel-contracts"
          aria-selected={activeTab === 'contracts'}
          className={`admin-management__tab${activeTab === 'contracts' ? ' admin-management__tab--active' : ''}`}
          onClick={() => handleSelectTab('contracts')}
        >
          운동시설 제휴 계약
        </button>
        <button
          id="tab-jobseekers"
          type="button"
          role="tab"
          aria-controls="panel-jobseekers"
          aria-selected={activeTab === 'jobseekers'}
          className={`admin-management__tab${activeTab === 'jobseekers' ? ' admin-management__tab--active' : ''}`}
          onClick={() => handleSelectTab('jobseekers')}
        >
          구직 트레이너
        </button>
      </div>

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'contracts'
          ? (selectedGym ? renderMemberView() : renderGymList())
          : renderJobSeekers()}
      </div>
    </div>
  );
}

export default AdminManagement;
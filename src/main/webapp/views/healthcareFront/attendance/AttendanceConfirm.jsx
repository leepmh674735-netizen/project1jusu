import { useState, useEffect, useRef, useCallback } from 'react';

// PT형 계약 유형 라벨 (백엔드 h_contract_data.contract 코드 기준: 4=PT, 5=PT 체험)
const PT_TYPE_LABEL = { 4: 'PT', 5: 'PT 체험' };

// 날짜 차이 계산 안전 헬퍼 (타임존 오류 방지)
const getDaysBetween = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr.substring(0, 10));
  const end = new Date(endDateStr.substring(0, 10));
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((start - end) / 86400000);
};

function AttendanceConfirm() {
  const [pendingList, setPendingList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [myMembers, setMyMembers] = useState([]);
  const [memberStatus, setMemberStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  
  const scheduleFormRef = useRef(null);
  const abortControllerRef = useRef(null);

  const token = localStorage.getItem('accessToken');

  const cancelPendingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 공통 GET 헬퍼
  const fetchJson = useCallback(async (path, setter, label, signal) => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (response.ok) {
        setter(await response.json());
      } else {
        console.error(`${label} 로드 실패:`, await response.text());
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`${label} 조회 실패:`, error);
      }
    }
  }, [token]);

  const fetchAll = useCallback(() => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchJson('/fitb/attendance/pending', setPendingList, '대기 목록', controller.signal);
    fetchJson('/fitb/attendance/history', setHistoryList, '수업 이력', controller.signal);
    fetchJson('/fitb/attendance/schedule', setScheduleList, '일정 목록', controller.signal);
    fetchJson('/fitb/attendance/members/status', setMemberStatus, '회원 현황', controller.signal);
  }, [fetchJson]);

  const fetchMyMembers = useCallback(() => {
    fetchJson('/fitb/attendance/members', setMyMembers, '담당 회원');
  }, [fetchJson]);

  useEffect(() => {
    fetchAll();
    fetchMyMembers();
    return () => cancelPendingRequest();
  }, [fetchAll, fetchMyMembers]);

  // 출석 확인 처리 핸들러
  const handleConfirm = async (row) => {
    if (loading) return;
    if (!window.confirm(`${row.memberName || row.username}님의 PT 출석을 확인하시겠습니까?\n확인 시 잔여 횟수가 1회 차감됩니다.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/confirm/${row.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        alert(`출석 확인 완료! 잔여 PT 횟수: ${data.remainingCount}회`);
      } else {
        alert((await response.text()) || '출석 확인에 실패했습니다.');
      }
    } catch (error) {
      console.error('출석 확인 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchAll();
    }
  };

  // 일정 등록 핸들러
  const handleScheduleAdd = async (e) => {
    e.preventDefault();
    if (loading || !selectedDate) return;

    const formData = new FormData(scheduleFormRef.current);
    const data = Object.fromEntries(formData.entries());
    if (!data.username || !data.time) {
      alert('회원과 시간을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: parseInt(data.username, 10),
          scheduleAt: `${selectedDate}T${data.time}:00`,
          memo: data.memo || null,
        }),
      });
      if (response.ok) {
        alert('일정이 등록되었습니다.');
        if (scheduleFormRef.current) scheduleFormRef.current.reset();
        fetchJson('/fitb/attendance/schedule', setScheduleList, '일정 목록');
      } else {
        alert((await response.text()) || '일정 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 등록 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일정 삭제 핸들러
  const handleScheduleDelete = async (schedule) => {
    if (loading) return;
    if (!window.confirm(`${schedule.memberName || schedule.username}님의 ${schedule.scheduleAt?.substring(11, 16)} 일정을 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/schedule/${schedule.scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchJson('/fitb/attendance/schedule', setScheduleList, '일정 목록');
      } else {
        alert((await response.text()) || '일정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ===== 캘린더 연산 =====
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); };

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const groupByDate = (list, dateField) => list.reduce((acc, item) => {
    if (!item[dateField]) return acc;
    const dateStr = item[dateField].substring(0, 10);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const sessionsByDate = groupByDate(historyList, 'checkIn');
  const schedulesByDate = groupByDate(scheduleList, 'scheduleAt');

  const matchDay = (dateStr) => {
    const sessions = sessionsByDate[dateStr] || [];
    const schedules = schedulesByDate[dateStr] || [];

    const items = schedules.map((schedule) => {
      const session = sessions.find((s) => String(s.username) === String(schedule.username));
      const status = session ? 'done' : (dateStr < todayStr ? 'missed' : 'planned');
      return { schedule, session, status };
    });

    const matchedUsernames = new Set(items.filter((i) => i.session).map((i) => String(i.schedule.username)));
    const walkIns = sessions.filter((s) => !matchedUsernames.has(String(s.username)));

    return { items, walkIns };
  };

  const selected = selectedDate ? matchDay(selectedDate) : null;

  const lastSessionByMember = historyList.reduce((acc, session) => {
    if (!session.checkIn) return acc;
    const key = String(session.username);
    if (!acc[key] || session.checkIn > acc[key]) acc[key] = session.checkIn;
    return acc;
  }, {});

  const isMissedSchedule = (schedule) => {
    if (!schedule.scheduleAt) return false;
    const dateStr = schedule.scheduleAt.substring(0, 10);
    if (dateStr >= todayStr) return false;
    const sessions = sessionsByDate[dateStr] || [];
    return !sessions.some((s) => String(s.username) === String(schedule.username));
  };

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthDone = historyList.filter((s) => s.checkIn && s.checkIn.startsWith(monthPrefix)).length;
  const prevMonthDone = historyList.filter((s) => s.checkIn && s.checkIn.startsWith(prevMonthPrefix)).length;
  const monthMissed = scheduleList.filter((sc) => sc.scheduleAt && sc.scheduleAt.startsWith(monthPrefix) && isMissedSchedule(sc)).length;
  const performRate = monthDone + monthMissed > 0 ? Math.round((monthDone / (monthDone + monthMissed)) * 100) : null;
  const diffFromPrev = monthDone - prevMonthDone;

  const drill = selectedMember ? {
    contracts: memberStatus.filter((r) => String(r.username) === selectedMember),
    sessions: historyList.filter((s) => String(s.username) === selectedMember),
    upcoming: scheduleList
      .filter((sc) => String(sc.username) === selectedMember && sc.scheduleAt && sc.scheduleAt.substring(0, 10) >= todayStr)
      .sort((a, b) => (a.scheduleAt > b.scheduleAt ? 1 : -1)),
    missed: scheduleList.filter((sc) => String(sc.username) === selectedMember && isMissedSchedule(sc)),
  } : null;
  const drillName = drill
    ? (drill.contracts[0]?.memberName || drill.sessions[0]?.memberName || selectedMember)
    : null;

  const statusMeta = {
    done: { label: '✅ 완료', color: '#6d28d9', bg: '#f3e8ff', border: '#e9d5ff' },
    planned: { label: '🕒 예정', color: '#15803d', bg: '#f0fdf4', border: '#dcfce7' },
    missed: { label: '❌ 미수행', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  };

  const tabs = [
    { key: 'members', label: '담당 회원' },
    { key: 'schedule', label: '일정 관리' },
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>

      {/* ===== 탭바 ===== */}
      <div role="tablist" aria-label="PT 출석 및 일정 관리" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
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

      {/* ===== 담당 회원 탭 ===== */}
      {activeTab === 'members' && (
      <div id="panel-members" role="tabpanel" aria-labelledby="tab-members">

      <h3>👥 담당 회원 현황</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        담당 중인 유효 PT 계약별 잔여 횟수입니다. 잔여가 적은 회원이 위로 정렬되며, 3회 이하는 재등록 제안 대상으로 표시됩니다.
      </p>

      {memberStatus.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          담당 중인 유효 PT 계약이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>진행 현황</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>잔여</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>최근 수업</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약 기간</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {memberStatus.map((row) => {
              const total = row.totalCount || 0;
              const used = row.usedCount || 0;
              const remaining = row.remainingCount != null ? row.remainingCount : total - used;
              const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
              const isLow = remaining > 0 && remaining <= 3;
              const isDone = remaining <= 0;

              const lastSession = lastSessionByMember[String(row.username)];
              const elapsed = lastSession ? getDaysBetween(todayStr, lastSession) : null;
              const needCare = !isDone && (elapsed == null ? false : elapsed >= 14);

              return (
                <tr key={row.dataId}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedMember(selectedMember === String(row.username) ? null : String(row.username))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#2563eb', textDecoration: 'underline', padding: 0 }}>
                      {row.memberName || '-'}
                    </button>
                    {row.contract === 5 && (
                      <span style={{ display: 'block', marginTop: '3px', fontSize: '10px', color: '#d97706', fontWeight: 'bold' }}>
                        {PT_TYPE_LABEL[5]}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.username}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isDone ? '#9ca3af' : isLow ? '#f59e0b' : '#7c3aed', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>{used} / {total}회</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: isDone ? '#9ca3af' : isLow ? '#d97706' : '#6d28d9' }}>
                    {remaining}회
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: needCare ? '#b91c1c' : '#666' }}>
                    {lastSession ? (
                      <>
                        {lastSession.substring(0, 10)}<br />
                        <b>({elapsed === 0 ? '오늘' : `${elapsed}일 전`})</b>
                        {needCare && (
                          <span style={{ display: 'inline-block', marginLeft: '4px', fontSize: '10px', backgroundColor: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>
                            관리 필요
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#999' }}>수업 이력 없음</span>
                    )}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    {row.startDate || '-'} ~ {row.endDate || '무기한'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {isDone ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#6b7280', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>소진 완료</span>
                    ) : isLow ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>재등록 제안</span>
                    ) : (
                      <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', color: '#374151', padding: '3px 8px', borderRadius: '10px' }}>진행 중</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 회원 상세 드릴다운 패널 */}
      {drill && (
        <div style={{ marginTop: '15px', padding: '15px', border: '2px solid #bfdbfe', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#1d4ed8' }}>🔍 {drillName}님 상세</h4>
            <button onClick={() => setSelectedMember(null)}
              style={{ padding: '3px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
              닫기 ✕
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#374151' }}>📋 계약 진행</h5>
            {drill.contracts.map((contract) => {
              const total = contract.totalCount || 0;
              const used = contract.usedCount || 0;
              return (
                <p key={contract.dataId} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  계약 #{contract.dataId} [{PT_TYPE_LABEL[contract.contract] ?? '-'}] — {used} / {total}회 사용, <b>잔여 {contract.remainingCount}회</b>
                  <span style={{ color: '#888', fontSize: '12px' }}> ({contract.startDate || '-'} ~ {contract.endDate || '무기한'})</span>
                </p>
              );
            })}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#15803d' }}>🕒 예정 일정 ({drill.upcoming.length}건)</h5>
            {drill.upcoming.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>예정된 일정이 없습니다. 캘린더에서 다음 수업을 잡아주세요.</p>
            ) : (
              drill.upcoming.map((schedule) => (
                <p key={schedule.scheduleId} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span style={{ color: '#888', fontSize: '12px' }}> — {schedule.memo}</span>}
                </p>
              ))
            )}
          </div>

          {drill.missed.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#b91c1c' }}>❌ 미수행 일정 ({drill.missed.length}건)</h5>
              {drill.missed.map((schedule) => (
                <p key={schedule.scheduleId} style={{ margin: '2px 0', fontSize: '13px', color: '#b91c1c' }}>
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span style={{ fontSize: '12px' }}> — {schedule.memo}</span>}
                </p>
              ))}
            </div>
          )}

          <div>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#6d28d9' }}>✅ 수업 이력 (최근 {Math.min(drill.sessions.length, 10)}건 / 총 {drill.sessions.length}건)</h5>
            {drill.sessions.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>아직 진행한 수업이 없습니다.</p>
            ) : (
              drill.sessions.slice(0, 10).map((session) => (
                <p key={session.id} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  {session.checkIn.substring(0, 10).replaceAll('-', '.')} — 출석 {session.checkIn.substring(11, 16)}
                  {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''}
                </p>
              ))
            )}
          </div>
        </div>
      )}

      </div>
      )}

      {/* ===== 일정 관리 탭 ===== */}
      {activeTab === 'schedule' && (
      <div id="panel-schedule" role="tabpanel" aria-labelledby="tab-schedule">

      <h3>🤝 PT 출석 확인</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
        오늘 접수된 담당 회원의 PT 출석 목록입니다. 확인 버튼을 누르면 해당 회원의 잔여 PT 횟수가 1회 차감되고, 그날 일정이 있으면 완료로 채워집니다.
      </p>

      <button onClick={fetchAll} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
        🔄 새로고침
      </button>

      {pendingList.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          확인 대기 중인 PT 출석이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>출석 시간</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>잔여 횟수</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.memberName || '-'}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.username}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.checkIn ? row.checkIn.substring(11, 16) : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.remainingCount != null ? `${row.remainingCount}회` : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <button onClick={() => handleConfirm(row)} disabled={loading}
                    style={{ padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold' }}>
                    출석 확인
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <h3>📅 내 PT 캘린더</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        등록한 일정이 수행되면 <span style={{ color: '#6d28d9', fontWeight: 'bold' }}>완료</span>로 채워집니다.
        지나간 일정에 출석이 없으면 <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>미수행</span>으로 표시됩니다.
        날짜를 클릭하면 상세 확인 및 일정 등록이 가능합니다.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #e9d5ff', borderRadius: '8px', backgroundColor: '#faf5ff', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 'bold' }}>이번 달 수업</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#6d28d9' }}>{monthDone}건</div>
          <div style={{ fontSize: '11px', color: diffFromPrev > 0 ? '#15803d' : diffFromPrev < 0 ? '#b91c1c' : '#888' }}>
            지난달 대비 {diffFromPrev > 0 ? `+${diffFromPrev}` : diffFromPrev}건
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', backgroundColor: '#f0fdf4', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 'bold' }}>수행률</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#15803d' }}>{performRate != null ? `${performRate}%` : '-'}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>완료 {monthDone} / 미수행 {monthMissed}</div>
        </div>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #dbeafe', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 'bold' }}>담당 회원</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1d4ed8' }}>{myMembers.length}명</div>
          <div style={{ fontSize: '11px', color: '#888' }}>유효 계약 {memberStatus.length}건</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={handlePrevMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>&lt; 이전달</button>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>다음달 &gt;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        <div style={{ color: 'red' }}>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div style={{ color: 'blue' }}>토</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} style={{ minHeight: '62px' }} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const { items, walkIns } = matchDay(dateStr);
          const doneCount = items.filter((i) => i.status === 'done').length + walkIns.length;
          const plannedCount = items.filter((i) => i.status === 'planned').length;
          const missedCount = items.filter((i) => i.status === 'missed').length;
          const isSelected = selectedDate === dateStr;
          const hasAny = doneCount + plannedCount + missedCount > 0;

          return (
            <div
              key={`day-${day}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                minHeight: '62px',
                border: isSelected ? '2px solid #7c3aed' : '1px solid #eee',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: doneCount > 0 ? '#f3e8ff' : plannedCount > 0 ? '#f0fdf4' : missedCount > 0 ? '#fef2f2' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: hasAny ? 'bold' : 'normal', color: '#333' }}>
                {day}
              </span>

              {doneCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  완료 {doneCount}
                </span>
              )}
              {plannedCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  예정 {plannedCount}
                </span>
              )}
              {missedCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  미수행 {missedCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && selected && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>{selectedDate.replaceAll('-', '.')}</h4>

          {selected.items.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 15px 0' }}>
              {selected.items.map(({ schedule, session, status }) => {
                const meta = statusMeta[status];
                return (
                  <li key={`p-${schedule.scheduleId}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', marginBottom: '6px', border: `1px solid ${meta.border}`, borderRadius: '6px', backgroundColor: meta.bg, fontSize: '14px' }}>
                    <span>
                      <span style={{ fontWeight: 'bold', color: meta.color, marginRight: '8px' }}>{meta.label}</span>
                      <b>{schedule.scheduleAt ? schedule.scheduleAt.substring(11, 16) : '-'}</b>{' '}
                      {schedule.memberName || schedule.username}
                      {schedule.memo && <span style={{ color: '#888', fontSize: '12px' }}> — {schedule.memo}</span>}
                      {session && (
                        <span style={{ color: '#6d28d9', fontSize: '12px', marginLeft: '8px' }}>
                          (출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                          {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''})
                        </span>
                      )}
                    </span>
                    {status !== 'done' && (
                      <button onClick={() => handleScheduleDelete(schedule)} disabled={loading}
                        style={{ padding: '3px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #fca5a5', borderRadius: '4px', backgroundColor: '#fff', color: '#dc2626', flexShrink: 0 }}>
                        삭제
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {selected.walkIns.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 6px 0', color: '#6d28d9' }}>📌 일정 외 진행 수업 ({selected.walkIns.length}건)</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {selected.walkIns.map((session) => (
                  <li key={`s-${session.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid #f3e8ff', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>{session.memberName || session.username}</span>
                    <span style={{ color: '#666' }}>
                      출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                      {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.items.length === 0 && selected.walkIns.length === 0 && (
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 15px 0' }}>이 날짜에는 수업/일정이 없습니다.</p>
          )}

          <div style={{ padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#15803d' }}>➕ 이 날짜에 일정 등록</h5>
            <form ref={scheduleFormRef} onSubmit={handleScheduleAdd} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select name="username" required defaultValue="" style={{ padding: '7px', fontSize: '13px' }}>
                <option value="" disabled>담당 회원 선택</option>
                {myMembers.map((member) => (
                  <option key={member.username} value={member.username}>{member.name} ({member.username})</option>
                ))}
              </select>
              <input type="time" name="time" required style={{ padding: '6px', fontSize: '13px' }} />
              <input type="text" name="memo" placeholder="메모 (선택)" maxLength={100} style={{ padding: '7px', fontSize: '13px', flex: 1, minWidth: '120px' }} />
              <button type="submit" disabled={loading}
                style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#16a34a', color: '#fff' }}>
                등록
              </button>
            </form>
          </div>
        </div>
      )}

      </div>
      )}
    </div>
  );
}

export default AttendanceConfirm;
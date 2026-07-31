import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티

// B2B 사장님 마이페이지용 알림 내역 컴포넌트
function B2bNotification() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  // 진행 중인 요청 취소 헬퍼
  const cancelPendingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 내 알림 이력 목록 조회 함수 (fetchWithToken 연동)
  const fetchAlarms = useCallback(async (signal) => {
    setLoading(true);
    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/alarm/list`, {
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        setAlarms(Array.isArray(data) ? data : []);
      } else {
        console.error('알림 이력 로드 실패:', await response.text());
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('알림 이력 조회 실패:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchAlarms(controller.signal);

    return () => cancelPendingRequest();
  }, [fetchAlarms]);

  // 알림 클릭 시 읽음 처리 후, 연결된 페이지(link)가 있으면 이동
  const handleAlarmClick = async (alarm) => {
    // 1. 낙관적 업데이트 (클릭 즉시 UI상 읽음 상태 변경)
    if (alarm.read !== 'Y') {
      setAlarms((prev) =>
        prev.map((a) => (a.alarmId === alarm.alarmId ? { ...a, read: 'Y' } : a))
      );

      try {
        await fetchWithToken(
          `${import.meta.env.VITE_BACKEND_URL}/alarm/read?alarmId=${alarm.alarmId}`,
          { method: 'POST' }
        );
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    }

    // 2. 딥링크 이동
    if (alarm.link) {
      navigate(alarm.link);
    }
  };

  // 전체 읽음 처리 핸들러
  const handleReadAll = async () => {
    const unreadExist = alarms.some((a) => a.read !== 'Y');
    if (!unreadExist) return;

    setAlarms((prev) => prev.map((a) => ({ ...a, read: 'Y' })));

    try {
      await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/alarm/read/all`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
      fetchAlarms(); // 실패 시 상태 복구
    }
  };

  const unreadCount = alarms.filter((a) => a.read !== 'Y').length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>🔔 알림 내역</h3>
          {unreadCount > 0 && (
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>
              안 읽은 알림 {unreadCount}건
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleReadAll}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 'bold',
              }}
            >
              모두 읽음
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchAlarms()}
            disabled={loading}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          >
            {loading ? '불러오는 중...' : '🔄 새로고침'}
          </button>
        </div>
      </div>

      {loading && alarms.length === 0 ? (
        <p style={{ color: '#888', padding: '20px 0', textAlign: 'center' }}>알림 내역을 불러오는 중입니다...</p>
      ) : alarms.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          새로운 알림 소식이 없습니다.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '110px' }}>구분</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'left' }}>내용</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '140px' }}>수신일</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '80px' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map((alarm) => {
                const isUnread = alarm.read !== 'Y';
                return (
                  <tr
                    key={alarm.alarmId}
                    onClick={() => handleAlarmClick(alarm)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isUnread ? '#eff6ff' : '#ffffff',
                      fontWeight: isUnread ? 'bold' : 'normal',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: isUnread ? '#3b82f6' : '#e5e7eb',
                          color: isUnread ? '#ffffff' : '#4b5563',
                        }}
                      >
                        {alarm.category || '알림'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', color: isUnread ? '#1e3a8a' : '#374151' }}>
                      {alarm.message}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                      {alarm.createdAt || alarm.createAt || '-'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      {isUnread ? (
                        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>안읽음</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>읽음</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default B2bNotification;
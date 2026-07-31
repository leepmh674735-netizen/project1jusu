import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼 유틸리티

// B2B 사장님/관리자용 건의사항 접수 및 처리 컴포넌트
function B2bComplaint() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // 로그인 세션에서 사장님 정보 획득 (파싱 에러 방지)
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getUserData();

  // 진행 중인 비동기 요청 취소 헬퍼
  const cancelPendingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 소속 체육관 건의사항 목록 조회 함수 (fetchWithToken 연동)
  const fetchGymComplaints = useCallback(async (signal) => {
    if (!user.gymId) return;

    try {
      const response = await fetchWithToken(
        `${import.meta.env.VITE_BACKEND_URL}/complaint/ownerlist?gymId=${user.gymId}`,
        { signal }
      );

      if (response.ok) {
        const data = await response.json();
        setComplaints(Array.isArray(data) ? data : []);
      } else {
        console.error('건의 내역 로드 실패:', await response.text());
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('건의 내역 조회 실패:', error);
      }
    }
  }, [user.gymId]);

  // 마운트 시 및 gymId 변경 시 최초 조회
  useEffect(() => {
    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchGymComplaints(controller.signal);

    return () => cancelPendingRequest();
  }, [fetchGymComplaints]);

  // 건의사항 처리 상태 수정 요청 핸들러
  const handleStatusChange = async (complaintId, newStatus) => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/complaint/status`, {
        method: 'POST',
        body: JSON.stringify({
          complaintId: complaintId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        alert('처리 상태가 정상적으로 변경되었습니다.');
        fetchGymComplaints(); // 목록 최신화
      } else {
        const errText = await response.text();
        alert(errText || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 통신 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 상태값별 텍스트 색상 매핑
  const getStatusColor = (status) => {
    switch (status) {
      case '처리완료':
        return '#15803d'; // 초록
      case '처리중':
        return '#2563eb'; // 파랑
      default:
        return '#d97706'; // 주황 (처리대기)
    }
  };

  // 날짜 안전 포맷팅 헬퍼
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return String(dateStr).slice(0, 10).replace(/-/g, '.');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0' }}>📋 회원 건의사항 접수 현황</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            우리 지점 회원들이 제출한 불편 및 건의사항을 확인하고 처리 상태를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchGymComplaints()}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {complaints.length === 0 ? (
        <p style={{ padding: '40px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          접수된 건의 내역이 없습니다.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '60px' }}>번호</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '130px' }}>회원 ID (전화번호)</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '160px' }}>제목</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>내용</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '110px' }}>접수일자</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '90px' }}>현재상태</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '110px' }}>상태 변경</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((item) => (
                <tr key={item.complaintId}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280' }}>
                    #{item.complaintId}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {item.username || '-'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                    {item.title}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                    {item.content}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    {formatDate(item.createdAt || item.createAt)}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <strong style={{ color: getStatusColor(item.status) }}>
                      {item.status || '처리대기'}
                    </strong>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <select
                      value={item.status || '처리대기'}
                      disabled={loading}
                      onChange={(e) => handleStatusChange(item.complaintId, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="처리대기">처리대기</option>
                      <option value="처리중">처리중</option>
                      <option value="처리완료">처리완료</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default B2bComplaint;
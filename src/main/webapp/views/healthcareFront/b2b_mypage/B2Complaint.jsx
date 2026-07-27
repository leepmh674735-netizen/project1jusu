import { useCallback, useEffect, useState } from 'react';

// B2B 사장님/관리자용 건의사항 접수 및 처리 컴포넌트
function B2bComplaint() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // 로그인 세션에서 사장님 정보 획득 (파싱 에러 방지)
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getUserData();

  // 소속 체육관 건의사항 목록 조회 함수
  const fetchGymComplaints = useCallback(async () => {
    if (!user.gymId) return;

    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/complaint/ownerlist?gymId=${user.gymId}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComplaints(data || []);
      } else {
        console.error('건의 내역 로드 실패:', await response.text());
      }
    } catch (error) {
      console.error('건의 내역 조회 실패:', error);
    }
  }, [user.gymId]);

  // 컴포넌트 마운트 시 최초 조회
  useEffect(() => {
    fetchGymComplaints();
  }, [fetchGymComplaints]);

  // 건의사항 처리 상태 수정 요청 핸들러
  const handleStatusChange = async (complaintId, newStatus) => {
    if (loading) return;

    const token = localStorage.getItem('accessToken');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/complaint/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          complaintId: complaintId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        alert('처리 상태가 변경되었습니다.');
        fetchGymComplaints(); // 목록 최신화
      } else {
        alert((await response.text()) || '상태 변경에 실패했습니다.');
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>📋 회원 건의사항 접수 현황</h3>
        <button
          type="button"
          onClick={fetchGymComplaints}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
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
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          접수된 건의 내역이 없습니다.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '60px' }}>번호</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb', width: '130px' }}>회원 ID(전화번호)</th>
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
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{item.complaintId}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{item.username}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{item.title}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', whiteSpace: 'pre-line' }}>{item.content}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                    {/* createAt -> createdAt 으로 오타 수정 반영 */}
                    {item.createdAt || '-'}
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
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
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
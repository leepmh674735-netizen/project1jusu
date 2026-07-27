import { useCallback, useEffect, useState } from "react";
import './B2cPages.css';

function Membership() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(false);

  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const user = getUserData();

  const fetchMyMemberships = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/membership/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMemberships(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('멤버십 내역 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('멤버십 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyMemberships();
  }, [fetchMyMemberships]);

  const getContractName = (contractVal) => {
    switch (Number(contractVal)) {
      case 1: return "제휴계약";
      case 2: return "근로계약";
      case 3: return "헬스장이용권";
      case 4: return "PT 이용권";
      case 5: return "PT 체험권";
      default: return "이용권";
    }
  };

  return (
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">내 멤버십 정보</h2>
      </header>
      {loading ? (
        <p className="b2c-empty">멤버십 정보를 불러오는 중입니다...</p>
      ) : memberships.length === 0 ? (
        <p className="b2c-empty">이용 중인 피트니스 회원권(멤버십) 정보가 없습니다.</p>
      ) : (
        <table className="b2c-data-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>계약종류</th>
              <th>시작일</th>
              <th>만료일</th>
              <th>결제액</th>
              <th>담당자</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((item, idx) => (
              <tr key={item.dataId || idx}>
                <td data-label="번호">{idx + 1}</td>
                <td data-label="계약종류" className="b2c-data-table__accent">{getContractName(item.contract)}</td>
                <td data-label="시작일" className="b2c-data-table__muted">{item.startDate || '-'}</td>
                <td data-label="만료일" className="b2c-data-table__muted">{item.endDate || '-'}</td>
                <td data-label="결제액" className="b2c-data-table__numeric">
                  {item.amount ? `${Number(item.amount).toLocaleString()}원` : '0원'}
                </td>
                <td data-label="담당자" className="b2c-data-table__muted">{item.managerName || item.managerId || '미지정'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Membership;
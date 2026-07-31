import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './Itempage.css';
import { useSearchParams } from 'react-router-dom';
import Pagination from './Pagination';
import { fetchWithToken } from '../utils/fetchWithToken'; // 공통 fetch 래퍼

const ITEM_CATEGORY_CHIPS = [
  { value: '', label: '전체' },
  { value: '기구', label: '기구' },
  { value: '소모품', label: '소모품' },
  { value: '용품', label: '용품' },
  { value: '기타', label: '기타' },
];

const categoryBadgeClass = (category) => {
  if (category === '기구') return 'item-category-badge--gear';
  if (category === '소모품') return 'item-category-badge--consumable';
  if (category === '용품') return 'item-category-badge--goods';
  return 'item-category-badge--etc';
};

const formatDot = (date) => (date ? String(date).slice(0, 10).replace(/-/g, '.') : '—');

const expiryMeta = (expiryDate) => {
  if (!expiryDate) return { label: '—', level: 'none' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${String(expiryDate).slice(0, 10)}T00:00:00`);
  const dday = Math.round((end - today) / 86400000);
  if (dday < 0) return { label: '만료', level: 'expired' };
  if (dday === 0) return { label: 'D-0', level: 'soon' };
  return { label: `D-${dday}`, level: dday <= 30 ? 'soon' : 'normal' };
};

function Itempage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'form' ? 'form' : 'list';
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailList, setDetailList] = useState([]);

  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: '',
    itemPrice: '',
    itemCount: '',
    itemExpiryDate: ''
  });

  const [items, setItems] = useState([]);
  const [pager, setPager] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const [itemNames, setItemNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const abortControllerRef = useRef(null);

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const setActiveTab = (view) => {
    const next = new URLSearchParams(searchParams);
    if (view === 'form') next.set('view', 'form');
    else next.delete('view');
    setSelectedItem(null);
    setEditingItem(null);
    setSearchParams(next);
  };

  // 1. 물품 목록 조회 (fetchWithToken 연동)
  const fetchItems = useCallback(async (targetPage, keyword, sort, category) => {
    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: targetPage,
        pageSize,
        keyword: keyword || '',
        sort: sort || '',
        category: category || ''
      });

      const response = await fetchWithToken(
        `${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/list?${query.toString()}`,
        { signal: controller.signal }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setPager(data.pager || null);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch items:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. 전체 품목명 목록 조회
  const fetchItemNames = useCallback(async () => {
    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/names`);
      if (response.ok) {
        setItemNames(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch item names:', error);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setSearchTerm('');
    setCategoryFilter('');
    fetchItems(1, '', sortOption, '');
    fetchItemNames();
    return () => cancelPendingRequests();
  }, [sortOption, fetchItems, fetchItemNames]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchItems(1, searchTerm, sortOption, categoryFilter);
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelPendingRequests();
    };
  }, [searchTerm, sortOption, categoryFilter, fetchItems]);

  const handlePageChange = (targetPage) => {
    setPage(targetPage);
    fetchItems(targetPage, searchTerm, sortOption, categoryFilter);
  };

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSortOption(newSort);
    setPage(1);
    fetchItems(1, searchTerm, newSort, categoryFilter);
  };

  const handleCategoryChange = (nextCategory) => {
    setCategoryFilter(nextCategory);
    setPage(1);
    fetchItems(1, searchTerm, sortOption, nextCategory);
  };

  const escapeCsvField = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 3. CSV 내보내기
  const handleExportCsv = async () => {
    try {
      const query = new URLSearchParams({ keyword: searchTerm || '', category: categoryFilter || '' });
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/export?${query.toString()}`);
      if (!response.ok) {
        alert('내보내기에 실패했습니다.');
        return;
      }

      const allItems = await response.json();
      if (!allItems || allItems.length === 0) {
        alert('내보낼 물품이 없습니다.');
        return;
      }

      const header = ['번호', '분류', '물품명', '갯수'];
      const rows = allItems.map((item, index) => [index + 1, item.itemCategory, item.itemName, item.itemCount]);
      const csvContent = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `물품목록_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  const currentMonthKey = useMemo(() => new Date().toISOString().split('T')[0].substring(0, 7), []);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(currentMonthKey);

  // 4. 상세 내역 조회
  const handleItemClick = async (item) => {
    setSelectedItem(item);
    setDetailList([]);
    setSelectedMonthFilter(currentMonthKey);
    try {
      const detailQuery = new URLSearchParams({
        itemName: item.itemName,
        itemCategory: item.itemCategory,
      });
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/detail?${detailQuery.toString()}`);
      if (response.ok) {
        setDetailList(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch item details:', error);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      itemCategory: item.itemCategory || item.item_category || '기구',
      itemName: item.itemName || item.item_name || '',
      itemDate: item.itemDate || item.item_date || item.itemBuy || item.item_buy || '',
      itemPrice: (item.itemPrice !== undefined ? item.itemPrice : item.item_price) || 0,
      itemCount: (item.itemCount !== undefined ? item.itemCount : item.item_count) || 0,
      itemExpiryDate: item.itemExpiryDate || item.item_expiry_date || ''
    });
  };

  // 5. 물품 정보 수정
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.itemName.trim()) {
      alert('물품명을 입력해주세요.');
      return;
    }
    if (!editFormData.itemCategory.trim()) {
      alert('분류를 입력해주세요.');
      return;
    }
    if (!editFormData.itemCount || parseInt(editFormData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const updatedItem = {
      itemId: editingItem.itemId !== undefined ? editingItem.itemId : editingItem.item_id,
      itemCategory: editFormData.itemCategory.trim(),
      itemName: editFormData.itemName.trim(),
      itemDate: editFormData.itemDate || editFormData.itemBuy || '',
      itemPrice: editFormData.itemPrice ? parseInt(editFormData.itemPrice, 10) : 0,
      itemCount: parseInt(editFormData.itemCount, 10),
      itemExpiryDate: editFormData.itemExpiryDate || null
    };

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/update`, {
        method: 'POST',
        body: JSON.stringify(updatedItem)
      });

      if (response.ok) {
        alert('물품 정보가 성공적으로 수정되었습니다.');
        fetchItems(page, searchTerm, sortOption, categoryFilter);
        fetchItemNames();
        handleItemClick(updatedItem);
        setEditingItem(null);
      } else {
        alert('물품 정보 수정에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 6. 물품 삭제
  const handleDeleteClick = async (item) => {
    if (!window.confirm('정말로 이 물품 항목을 삭제하시겠습니까?')) {
      return;
    }

    const payload = {
      itemId: item.itemId !== undefined ? item.itemId : item.item_id,
      itemName: item.itemName || item.item_name || ''
    };

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/delete`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('물품이 삭제되었습니다.');
        fetchItems(page, searchTerm, sortOption, categoryFilter);
        fetchItemNames();
        const deletedId = item.itemId !== undefined ? item.itemId : item.item_id;
        setDetailList(prev => {
          const remaining = prev.filter(d => {
            const dId = d.itemId !== undefined ? d.itemId : d.item_id;
            return dId !== deletedId;
          });
          if (remaining.length === 0) {
            setSelectedItem(null);
          }
          return remaining;
        });
      } else {
        alert('물품 삭제에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
  }, [currentYear]);

  const filteredDetails = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      return detailList;
    }
    return detailList.filter((item) => {
      const buyDate = item.itemDate || item.item_date || item.item_Date || item.itemBuy || item.item_buy;
      return buyDate && buyDate.substring(0, 7) === selectedMonthFilter;
    });
  }, [detailList, selectedMonthFilter]);

  const currentStats = useMemo(() => {
    let purchaseCount = 0;
    let disposalCount = 0;

    filteredDetails.forEach((item) => {
      const count = item.itemCount !== undefined ? item.itemCount : item.item_count || 0;
      const isDisposal = item.itemStatus === '폐기' || item.item_status === '폐기' || count < 0;
      const displayCount = Math.abs(count);

      if (isDisposal) {
        disposalCount += displayCount;
      } else {
        purchaseCount += displayCount;
      }
    });

    const totalCount = purchaseCount - disposalCount;
    return { totalCount, purchaseCount, disposalCount };
  }, [filteredDetails]);

  const [formData, setFormData] = useState({
    itemCategory: '기구',
    itemName: '',
    itemDate: new Date().toISOString().split('T')[0],
    itemPrice: '',
    itemCount: '',
    itemStatus: '구매',
    itemExpiryDate: ''
  });

  const existingItemNames = useMemo(() => {
    const names = itemNames.map(item => item.itemName).filter(Boolean);
    return Array.from(new Set(names));
  }, [itemNames]);

  const existingCategories = useMemo(() => {
    const base = ['기구', '소모품', '식품', '기타'];
    const used = itemNames.map(item => item.itemCategory).filter(Boolean);
    return Array.from(new Set([...base, ...used]));
  }, [itemNames]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemNameChange = (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, itemName: value };
      const matchedItem = itemNames.find(item => item.itemName === value);
      if (matchedItem) {
        updated.itemCategory = matchedItem.itemCategory;
      }
      return updated;
    });
  };

  // 7. 신규 물품 등록
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const finalItemName = formData.itemName.trim();
    const finalItemCategory = formData.itemCategory.trim();

    if (!finalItemName) {
      alert('물품명을 입력하거나 선택해주세요.');
      return;
    }
    if (!finalItemCategory) {
      alert('분류를 입력하거나 선택해주세요.');
      return;
    }
    if (!formData.itemCount || parseInt(formData.itemCount, 10) <= 0) {
      alert('올바른 갯수를 입력해주세요.');
      return;
    }

    const isDisposal = formData.itemStatus === '폐기';
    const finalCount = parseInt(formData.itemCount, 10);
    const newItem = {
      itemId: 0,
      itemCategory: finalItemCategory,
      itemName: finalItemName,
      itemDate: formData.itemDate,
      itemPrice: isDisposal ? 0 : (formData.itemPrice ? parseInt(formData.itemPrice, 10) : 0),
      itemCount: isDisposal ? -finalCount : finalCount,
      itemStatus: formData.itemStatus,
      itemExpiryDate: formData.itemExpiryDate || null
    };

    try {
      const response = await fetchWithToken(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/add`, {
        method: 'POST',
        body: JSON.stringify(newItem)
      });

      if (response.ok) {
        alert('물품이 성공적으로 등록되었습니다.');
        setPage(1);
        setCategoryFilter('');
        fetchItems(1, searchTerm, sortOption, '');
        fetchItemNames();

        setFormData({
          itemCategory: '기구',
          itemName: '',
          itemDate: new Date().toISOString().split('T')[0],
          itemPrice: '',
          itemCount: '',
          itemStatus: '구매',
          itemExpiryDate: ''
        });
        setActiveTab('list');
      } else {
        alert('물품 등록에 실패하였습니다.');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="item-page-container">
      <datalist id="item-category-options">
        {existingCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <main className="item-content-area">
        {activeTab === 'list' && (
          <div className="item-tab-content">
            {editingItem ? (
              <div className="item-card">
                <div className="item-section-header">
                  <h2 className="item-card-title item-card-title--flush">물품 정보 수정</h2>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="item-secondary-btn"
                  >
                    취소
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="item-form">
                  <div className="item-form-grid">
                    <div className="item-form-group">
                      <label htmlFor="editItemName">물품명 *</label>
                      <input
                        id="editItemName"
                        type="text"
                        name="itemName"
                        className="item-input"
                        value={editFormData.itemName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemName: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="item-form-group">
                      <label htmlFor="editItemCategory">분류</label>
                      <input
                        id="editItemCategory"
                        type="text"
                        name="itemCategory"
                        className="item-input"
                        list="item-category-options"
                        placeholder="분류 선택 또는 새로 입력"
                        value={editFormData.itemCategory}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemCategory: e.target.value }))}
                      />
                    </div>

                    <div className="item-form-group">
                      <label htmlFor="editItemDate">등록일 (수정 불가)</label>
                      <input
                        id="editItemDate"
                        type="date"
                        name="itemDate"
                        className="item-input"
                        value={editFormData.itemDate || editFormData.itemBuy || ''}
                        disabled
                      />
                    </div>

                    <div className="item-form-group">
                      <label htmlFor="editItemPrice">가격 (원)</label>
                      <input
                        id="editItemPrice"
                        type="number"
                        name="itemPrice"
                        className="item-input"
                        value={editFormData.itemPrice}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemPrice: e.target.value }))}
                        min="0"
                      />
                    </div>

                    <div className="item-form-group">
                      <label htmlFor="editItemCount">갯수 *</label>
                      <input
                        id="editItemCount"
                        type="number"
                        name="itemCount"
                        className="item-input"
                        value={editFormData.itemCount}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemCount: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>

                    <div className="item-form-group">
                      <label htmlFor="editItemExpiryDate">유효기간 (선택)</label>
                      <input
                        id="editItemExpiryDate"
                        type="date"
                        name="itemExpiryDate"
                        className="item-input"
                        value={editFormData.itemExpiryDate || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, itemExpiryDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="item-form-actions">
                    <button type="submit" className="item-submit-btn item-submit-btn--grow">수정 완료</button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="item-secondary-btn item-secondary-btn--grow"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            ) : !selectedItem ? (
              <div className="item-card">
                <div className="item-filter-bar">
                  <div className="item-chip-group" role="tablist" aria-label="카테고리 필터">
                    {ITEM_CATEGORY_CHIPS.map((chip) => (
                      <button
                        key={chip.value || 'all'}
                        type="button"
                        role="tab"
                        aria-selected={categoryFilter === chip.value}
                        className={`item-chip${categoryFilter === chip.value ? ' item-chip--active' : ''}`}
                        onClick={() => handleCategoryChange(chip.value)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="item-register-btn" onClick={() => setActiveTab('form')}>
                    + 물품 등록
                  </button>
                </div>

                <div className="item-search-bar">
                  <input
                    type="text"
                    className="item-search-input"
                    placeholder="물품명 또는 카테고리로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    className="item-sort-select"
                    value={sortOption}
                    onChange={handleSortChange}
                    aria-label="물품 정렬 방식"
                  >
                    <option value="">기본순 (이름순)</option>
                    <option value="count_desc">수량 많은순</option>
                    <option value="count_asc">수량 적은순</option>
                    <option value="price_desc">가격 높은순</option>
                    <option value="price_asc">가격 낮은순</option>
                  </select>
                  <button type="button" className="item-export-btn" onClick={handleExportCsv}>
                    CSV 내보내기
                  </button>
                </div>

                <div className="item-table-wrapper">
                  <table className="item-table">
                    <thead>
                      <tr>
                        <th>카테고리</th>
                        <th>물품명</th>
                        <th>구매일</th>
                        <th className="item-table__num-col">단가</th>
                        <th className="item-table__num-col">수량</th>
                        <th>유통기한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="item-table__empty">물품 목록을 불러오는 중입니다...</td>
                        </tr>
                      ) : items.length > 0 ? (
                        items.map((item, index) => {
                          const expiry = expiryMeta(item.itemExpiryDate);
                          return (
                            <tr
                              key={item.itemId || index}
                              className="is-clickable"
                              onClick={() =>
                                window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
                                  detail: { kind: 'item', id: item.itemId ?? item.itemName ?? index, title: item.itemName ?? '물품', data: item },
                                }))
                              }
                            >
                              <td>
                                <span className={`item-category-badge ${categoryBadgeClass(item.itemCategory)}`}>
                                  {item.itemCategory}
                                </span>
                              </td>
                              <td className="item-table__name">
                                <button
                                  type="button"
                                  className="item-table__detail-button"
                                  onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                >
                                  {item.itemName}
                                </button>
                              </td>
                              <td className="item-table__date">{formatDot(item.itemDate)}</td>
                              <td className="item-table__num-col">
                                {item.itemPrice != null ? item.itemPrice.toLocaleString() : '-'}
                              </td>
                              <td className="item-table__num-col">
                                <span className="item-table__count">{item.itemCount.toLocaleString()}</span> 개
                              </td>
                              <td>
                                <span className={`item-expiry-badge item-expiry-badge--${expiry.level}`}>
                                  {expiry.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="item-table__empty">
                            검색 조건에 맞는 물품이 없거나 현재 사업장에 등록된 물품이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination pager={pager} onPageChange={handlePageChange} />
              </div>
            ) : (
              <div className="item-card">
                <div className="item-section-header">
                  <div>
                    <span className="item-category-badge item-category-badge--large">
                      {selectedItem.itemCategory}
                    </span>
                    <h2 className="item-card-title item-card-title--inline">
                      {selectedItem.itemName} 상세 정보
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="item-secondary-btn"
                  >
                    ← 목록으로 돌아가기
                  </button>
                </div>

                <div className="item-summary-grid">
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 총 갯수' : '선택 월 총 갯수'}
                    </div>
                    <div className="item-summary-card__value">
                      {currentStats.totalCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 구매 갯수' : '선택 월 구매 갯수'}
                    </div>
                    <div className="item-summary-card__value item-summary-card__value--success">
                      {currentStats.purchaseCount.toLocaleString()} 개
                    </div>
                  </div>
                  <div className="item-summary-card">
                    <div className="item-summary-card__label">
                      {selectedMonthFilter === 'all' ? '전체 기간 폐기 갯수' : '선택 월 폐기 갯수'}
                    </div>
                    <div className="item-summary-card__value item-summary-card__value--danger">
                      {currentStats.disposalCount.toLocaleString()} 개
                    </div>
                  </div>
                </div>

                <div className="item-detail-toolbar">
                  <h3>
                    📦 등록 및 관리 내역 리스트 ({detailList.length}건)
                  </h3>

                  <label className="item-month-filter">
                    <span>조회 월 선택:</span>
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      aria-label="상세 조회 월 선택"
                    >
                      <option value="all">전체 내역</option>
                      {availableMonths.map(m => {
                        const isCurrent = m === currentMonthKey;
                        return (
                          <option key={m} value={m}>
                            {m.substring(0, 4)}년 {m.substring(5, 7)}월 {isCurrent ? '(이번 달)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                {filteredDetails.length > 0 ? (
                  <div className="item-table-wrapper">
                    <table className="item-table">
                      <thead>
                        <tr>
                          <th>물품 ID</th>
                          <th>구분</th>
                          <th>등록일자</th>
                          <th>단가 (가격)</th>
                          <th>수량</th>
                          <th>합계 금액</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDetails.map((item) => {
                          const id = item.itemId !== undefined ? item.itemId : item.item_id;
                          const buyDate = item.itemDate || item.item_date || item.item_Date || item.itemBuy || item.item_buy || '-';
                          const price = item.itemPrice !== undefined ? item.itemPrice : item.item_price;
                          const count = item.itemCount !== undefined ? item.itemCount : item.item_count;

                          const isDisposal = item.itemStatus === '폐기' || item.item_status === '폐기' || count < 0;
                          const displayCount = Math.abs(count);
                          const totalPrice = (price || 0) * displayCount;

                          return (
                            <tr key={id}>
                              <td className="item-table__muted">#{id}</td>
                              <td>
                                <span className={`item-status-badge ${isDisposal ? 'is-disposal' : 'is-purchase'}`}>
                                  {isDisposal ? '폐기' : '구매'}
                                </span>
                              </td>
                              <td className="item-table__date">{buyDate}</td>
                              <td className="item-table__amount">{isDisposal ? '-' : (price ? `${price.toLocaleString()} 원` : '0 원')}</td>
                              <td className={`item-table__quantity ${isDisposal ? 'is-disposal' : ''}`}>
                                {isDisposal ? `-${displayCount} 개` : `${displayCount} 개`}
                              </td>
                              <td className="item-table__amount item-table__amount--strong">
                                {isDisposal ? '-' : `${totalPrice.toLocaleString()} 원`}
                              </td>
                              <td>
                                <div className="item-row-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(item)}
                                    className="item-row-action"
                                  >
                                    수정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(item)}
                                    className="item-row-action item-row-action--danger"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="item-detail-empty">
                    {selectedMonthFilter === 'all'
                      ? '등록된 상세 내역이 없습니다.'
                      : `${selectedMonthFilter.substring(0, 4)}년 ${selectedMonthFilter.substring(5, 7)}월에 등록된 내역이 없습니다.`}
                    <div className="item-detail-empty__hint">
                      (상단의 '조회 월 선택'에서 다른 월을 고르거나 전체 내역을 볼 수 있습니다.)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'form' && (
          <div className="item-tab-content">
            <div className="item-card">
              <h2 className="item-card-title">물품 등록</h2>
              <form onSubmit={handleFormSubmit} className="item-form">
                <div className="item-form-grid">
                  <div className="item-form-group full-width">
                    <label htmlFor="itemName">물품명 *</label>
                    <input
                      id="itemName"
                      type="text"
                      name="itemName"
                      className="item-input"
                      placeholder="물품명을 직접 입력하거나 아래 추천 품목에서 선택하세요..."
                      value={formData.itemName}
                      onChange={handleItemNameChange}
                      required
                    />
                    {existingItemNames.length > 0 && (
                      <div className="item-suggestions">
                        <div className="item-suggestions__label">
                          💡 내가 등록한 전체 물품 목록 (클릭 시 자동 입력):
                        </div>
                        <div className="item-suggestions__list">
                          {existingItemNames.map((name) => {
                            const isSelected = formData.itemName === name;
                            const matchedItem = itemNames.find(item => item.itemName === name);

                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    itemName: name,
                                    itemCategory: matchedItem ? matchedItem.itemCategory : prev.itemCategory
                                  }));
                                }}
                                className={`item-suggestion${isSelected ? ' is-selected' : ''}`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemStatus">구분 *</label>
                    <select
                      id="itemStatus"
                      name="itemStatus"
                      className="item-select"
                      value={formData.itemStatus}
                      onChange={handleInputChange}
                    >
                      <option value="구매">구매 (입고)</option>
                      <option value="폐기">폐기 (출고)</option>
                    </select>
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemCategory">분류</label>
                    <input
                      id="itemCategory"
                      type="text"
                      name="itemCategory"
                      className="item-input"
                      list="item-category-options"
                      placeholder="분류 선택 또는 새로 입력"
                      value={formData.itemCategory}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemDate">등록일 *</label>
                    <input
                      id="itemDate"
                      type="date"
                      name="itemDate"
                      className="item-input"
                      value={formData.itemDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemPrice">가격 (원)</label>
                    <input
                      id="itemPrice"
                      type="number"
                      name="itemPrice"
                      className="item-input"
                      placeholder="금액 입력"
                      value={formData.itemPrice}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemCount">갯수 *</label>
                    <input
                      id="itemCount"
                      type="number"
                      name="itemCount"
                      className="item-input"
                      placeholder="개수 입력"
                      value={formData.itemCount}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>

                  <div className="item-form-group">
                    <label htmlFor="itemExpiryDate">유효기간 (선택)</label>
                    <input
                      id="itemExpiryDate"
                      type="date"
                      name="itemExpiryDate"
                      className="item-input"
                      value={formData.itemExpiryDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <button type="submit" className="item-submit-btn">물품 등록하기</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Itempage;
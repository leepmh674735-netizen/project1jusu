package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.Pager;
import com.health.app.settle.ExpenseDTO;
import com.health.app.settle.SettleService;

@Service
public class ItemService {

	@Autowired
	private ItemMapper itemMapper;

	@Autowired
	private SettleService settleService;

	@Autowired
	private AlarmService alarmService;

	@Autowired
	private MemberService memberService;

	private Long ownerGymId(Long username) throws Exception {
		Long gymId = itemMapper.getOwnerGymId(username);
		if (gymId == null) {
			throw new IllegalArgumentException("OWNER 소속 사업장을 찾을 수 없습니다.");
		}
		return gymId;
	}

	@Transactional(rollbackFor = Exception.class)
	public int itemAddForOwner(Long username, ItemDTO itemDTO) throws Exception {
		itemDTO.setGymId(ownerGymId(username));
		return itemAdd(itemDTO);
	}

	public ItemListResponse itemListForOwner(Long username, Pager pager, String sort, String category)
			throws Exception {
		return itemList(ownerGymId(username), pager, sort, category);
	}

	public List<ItemDTO> itemNamesForOwner(Long username) throws Exception {
		return itemNames(ownerGymId(username));
	}

	public List<ItemDTO> itemListAllForOwner(Long username, String keyword, String category) throws Exception {
		return itemListAll(ownerGymId(username), keyword, category);
	}

	public List<ItemDTO> itemDetailForOwner(Long username, ItemDTO itemDTO) throws Exception {
		if (itemDTO.getItemName() == null || itemDTO.getItemName().isBlank() || itemDTO.getItemCategory() == null
				|| itemDTO.getItemCategory().isBlank()) {
			throw new IllegalArgumentException("물품명과 분류를 함께 지정해 주세요");
		}
		itemDTO.setGymId(ownerGymId(username));
		return itemDetail(itemDTO);
	}

	public int itemUpdateForOwner(Long username, ItemDTO itemDTO) throws Exception {
		itemDTO.setGymId(ownerGymId(username));
		return itemUpdate(itemDTO);
	}

	public int itemDeleteForOwner(Long username, ItemDTO itemDTO) throws Exception {
		itemDTO.setGymId(ownerGymId(username));
		return itemDelete(itemDTO);
	}

	public List<ItemDTO> selectCategoryForOwner(Long username, String category) throws Exception {
		return selectByCategory(ownerGymId(username), category);
	}

	public List<ItemDTO> selectByCategoryForGymUser(
			Long username, String role, Long adminGymId, String category) throws Exception {
		Long gymId;
		if (role != null && role.equalsIgnoreCase("ADMIN")) {
			if (adminGymId == null) {
				throw new IllegalArgumentException("조회할 사업장을 선택해 주세요.");
			}
			gymId = adminGymId;
		} else {
			gymId = itemMapper.getGymIdForGymUser(username);
			if (gymId == null) {
				throw new IllegalArgumentException("소속 사업장을 찾을 수 없습니다.");
			}
		}
		return selectByCategory(gymId, category);
	}

	@Transactional(rollbackFor = Exception.class)
	public int itemAdd(ItemDTO itemDTO) throws Exception {

		int result = itemMapper.itemAdd(itemDTO);

		if (result > 0 && itemDTO.getItemCount() != null && itemDTO.getItemCount() > 0) {
			ExpenseDTO expenseDTO = new ExpenseDTO();
			expenseDTO.setGymId(itemDTO.getGymId());
			expenseDTO.setDataId(null);
			expenseDTO.setExpenseName(itemDTO.getItemName() + " 구매");
			expenseDTO.setExpenseDate(itemDTO.getItemDate());
			
			long price = itemDTO.getItemPrice() != null ? itemDTO.getItemPrice() : 0L;
			long count = itemDTO.getItemCount() != null ? itemDTO.getItemCount() : 1L;
			long totalCost = price * count;
			
			expenseDTO.setExpensePrice(totalCost);
			expenseDTO.setExpenseRate(0);
			expenseDTO.setOriginItemId(itemDTO.getItemId());

			settleService.expenseAdd(expenseDTO);
		}

		return result;
	}

	public ItemListResponse itemList(Long gymId, Pager pager, String sort, String category) throws Exception {

		pager.makeOffset();
		List<ItemDTO> items = itemMapper.itemList(gymId, pager, sort, category);
		long totalCount = itemMapper.itemListCount(gymId, pager, category);
		pager.makeBlock(totalCount);

		return new ItemListResponse(items, pager, totalCount);
	}

	public List<ItemDTO> itemNames(Long gymId) throws Exception {
		return itemMapper.itemNames(gymId);
	}

	public List<ItemDTO> itemListAll(Long gymId, String keyword, String category) throws Exception {
		return itemMapper.itemListAll(gymId, keyword, category);
	}

	public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {
		return itemMapper.itemDetail(itemDTO);
	}

	public int itemUpdate(ItemDTO itemDTO) throws Exception {
		return itemMapper.itemUpdate(itemDTO);
	}

	public int itemDelete(ItemDTO itemDTO) throws Exception {
		return itemMapper.itemDelete(itemDTO);
	}

	public List<ItemDTO> selectByCategory(Long gymId, String category) throws Exception {
		return itemMapper.selectByCategory(gymId, category);
	}

	public int checkExpiringItems() throws Exception {
		List<ItemDTO> expiring = itemMapper.findExpiringItems();

		int sentCount = 0;
		for (ItemDTO item : expiring) {
			try {
				MemberDTO owner = memberService.findOwnerByGymId(item.getGymId());
				if (owner == null || owner.getUsername() == null) {
					continue;
				}

				String message = String.format("[%s] %s의 유효기간이 3일 후 (%s) 만료됩니다.", item.getItemCategory(),
						item.getItemName(), item.getItemExpiryDate());

				alarmService.sendAlarm(owner.getUsername(), null, message, "/fitb/message", "TIME_EXPIRY");
				sentCount++;
			} catch (Exception e) {
				System.err.println("유효기간 임박 알림 발송 실패 (itemId=" + item.getItemId() + "): " + e.getMessage());
			}
		}
		return sentCount;
	}

}
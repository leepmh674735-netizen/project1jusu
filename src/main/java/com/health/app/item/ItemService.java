package com.health.app.item;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.Pager;
import com.health.app.settle.ExpenseDTO;
import com.health.app.settle.SettleService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ItemService {

	private final ItemMapper itemMapper;
	private final SettleService settleService;
	private final MemberService memberService;
	private final AlarmService alarmService;

	@Transactional(rollbackFor = Exception.class)
	public int itemAdd(ItemDTO itemDTO) throws Exception {

		int result = itemMapper.itemAdd(itemDTO);

		if (result > 0 && itemDTO.getItemCount() != null && itemDTO.getItemCount() > 0) {
			ExpenseDTO expenseDTO = new ExpenseDTO();
			expenseDTO.setGymId(itemDTO.getGymId());
			expenseDTO.setDataId(null);
			expenseDTO.setExpenseName(itemDTO.getItemName() + "구매");
			expenseDTO.setExpenseDate(itemDTO.getItemDate());
			long price = itemDTO.getItemPrice() != null ? itemDTO.getItemPrice() : 0L;
			expenseDTO.setExpensePrice(price * itemDTO.getItemCount());
			expenseDTO.setExpenseRate(0);
			expenseDTO.setOriginItemId(itemDTO.getItemId());

			settleService.expenseAdd(expenseDTO);
		}

		return result;
	}

	public ItemListResponse itemList(Long gymId, Pager pager, String sort) throws Exception {

		pager.makeOffset();
		List<ItemDTO> items = itemMapper.itemList(gymId, pager, sort);
		long totalCount = itemMapper.itemListCount(gymId, pager);
		pager.makeBlock(totalCount);

		return new ItemListResponse(items, pager);
	}

	public List<ItemDTO> itemNames(Long gymId) throws Exception {

		return itemMapper.itemNames(gymId);
	}

	public List<ItemDTO> itemListAll(Long gymId, String keyword) throws Exception {

		return itemMapper.itemListAll(gymId, keyword);
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

				String message = String.format("[%s] %s의 유효기간이 3일 후(%s) 만료됩니다.", item.getItemCategory(),
						item.getItemName(), item.getItemExpiryDate());

				alarmService.sendAlarm(owner.getUsername(), null, message, "/fitb/itempage", "ITEM_EXPIRY");
				sentCount++;
			} catch (Exception e) {
				System.err.println("유효기간 임박 알림 발송 실패 (itemId=" + item.getItemId() + "): " + e.getMessage());
			}
		}
		return sentCount;
	}
}
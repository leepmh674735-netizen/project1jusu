package com.health.app.item;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.member.MemberService;
import com.health.app.settle.SettleService;

@ExtendWith(MockitoExtension.class)
public class ItemServiceTest {

	@Mock
	private ItemMapper itemMapper;

	@Mock
	private SettleService settleService;

	@Mock
	private MemberService memberService;

	@Mock
	private ItemService itemService;

	@Test
	void ownerGymOverridesClientGymWhenAddingItem() throws Exception {
		ItemDTO item = new ItemDTO();
		item.setGymId(999L);
		when(itemMapper.getOwnerGymId(1010L)).thenReturn(7L);
		when(itemMapper.itemAdd(item)).thenReturn(1);

		assertEquals(1, itemService.itemAddForOwner(1010L, item));
		assertEquals(7L, item.getGymId());
		verify(itemMapper).itemAdd(item);
	}

	@Test
	void updateAndDeleteDelegateWithOwnerGymInsteadClientGym() throws Exception {
		ItemDTO item = new ItemDTO();
		item.setItemId(55L);
		item.setGymId(999L);
		when(itemMapper.getOwnerGymId(1010L)).thenReturn(7L);
		when(itemMapper.itemUpdate(item)).thenReturn(0);
		when(itemMapper.itemDelete(item)).thenReturn(0);

		assertEquals(0, itemService.itemUpdateForOwner(1010L, item));
		assertEquals(7L, item.getGymId());
		verify(itemMapper).itemUpdate(item);

		item.setGymId(999L);
		assertEquals(0, itemService.itemDeleteForOwner(1010L, item));
		assertEquals(7L, item.getGymId());
		verify(itemMapper).itemDelete(item);
	}

	@Test
	void trainerCategoryLookkupUseGymFromServer() throws Exception {
		ItemDTO item = new ItemDTO();
		when(itemMapper.getGymIdForGymUser(2020L)).thenReturn(7L);
		when(itemMapper.selectByCategory(7L, "기구")).thenReturn(List.of(item));

		assertEquals(List.of(item), itemService.selectByCategoryForGymUser(2020L, "TRAINER", 9999L, "기구"));
		verify(itemMapper).selectByCategory(7L, "기구");
	}

	@Test
	void ownerItemAddEntryPointKeepsTransactionBoundary() throws Exception {
		Transactional annotation = ItemService.class.getMethod("itemAddForOwner", Long.class, ItemDTO.class)
				.getAnnotation(Transactional.class);

		assertNotNull(annotation);
	}

}

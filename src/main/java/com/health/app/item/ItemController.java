package com.health.app.item;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.pager.Pager;

import lombok.RequiredArgsConstructor;

@CrossOrigin
@RestController
@RequestMapping("/fitb/itempage")
@RequiredArgsConstructor
public class ItemController {

	private final ItemService itemService;

	@PostMapping("/add")
	public int itemAdd(@RequestBody ItemDTO newItem) throws Exception {
		return itemService.itemAdd(newItem);
	}

	@GetMapping("/list")
	public ItemListResponse itemList(
			@RequestParam(required = false) Long gymId,
			@RequestParam(required = false) Long page,
			@RequestParam(required = false) Long pageSize,
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String sort) throws Exception {

		Pager pager = new Pager();
		pager.setCurrentPage(page);
		pager.setPageSize(pageSize);
		pager.setSearchKeyword(keyword);

		return itemService.itemList(gymId, pager, sort);
	}

	@GetMapping("/names")
	public List<ItemDTO> itemNames(@RequestParam(required = false) Long gymId) throws Exception {
		return itemService.itemNames(gymId);
	}

	@GetMapping("/export")
	public List<ItemDTO> itemListAll(
			@RequestParam(required = false) Long gymId,
			@RequestParam(required = false) String keyword) throws Exception {
		return itemService.itemListAll(gymId, keyword);
	}

	@GetMapping("/byCategory")
	public List<ItemDTO> itemByCategory(
			@RequestParam(required = false) Long gymId,
			@RequestParam(required = false, defaultValue = "기구") String category) throws Exception {
		return itemService.selectByCategory(gymId, category);
	}

	@GetMapping("/detail")
	public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {
		return itemService.itemDetail(itemDTO);
	}

	@PostMapping("/update")
	public int itemUpdate(@RequestBody ItemDTO itemDTO) throws Exception {
		return itemService.itemUpdate(itemDTO);
	}

	@PostMapping("/delete")
	public int itemDelete(@RequestBody ItemDTO itemDTO) throws Exception {
		return itemService.itemDelete(itemDTO);
	}

}
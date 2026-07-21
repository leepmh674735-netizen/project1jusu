package com.health.app.item;

import java.util.List;

import com.health.app.pager.Pager;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItemListResponse {

	private List<ItemDTO> items;
	private Pager pager;
	private long totalCount;

	public ItemListResponse(List<ItemDTO> items, Pager pager) {
		this.items = items;
		this.pager = pager;
	}

}
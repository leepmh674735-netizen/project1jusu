package com.health.app.pager;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class PagedResponse<T> {
	
	private List<T> items;
	private Pager pager;
	private long totalCount;
	private long totalAmount;

}

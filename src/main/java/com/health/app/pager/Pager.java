package com.health.app.pager;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class Pager {

	private Long currentPage;
	private Long pageSize;
	private Long offset;
	private boolean hasPrev = true;
	private boolean hasNext = true;
	private String searchKeyword = "";
	private String searchType;
	private String month;
	private Long startPage;
	private Long endPage;

	public Long getCurrentPage() {
		if (this.currentPage == null || this.currentPage < 1) {
			this.currentPage = 1L;
		}
		return this.currentPage;
	}

	public Long getPageSize() {
		if (this.pageSize == null || this.pageSize < 1) {
			this.pageSize = 10L;
		}
		return this.pageSize;
	}

	public void makeOffset() {
		this.offset = (this.getCurrentPage() - 1) * this.getPageSize();
	}

	public void makeBlock(Long totalCount) {
		Long perBlock = 5L;

		if (totalCount == null || totalCount <= 0) {
			this.startPage = 1L;
			this.endPage = 1L;
			this.hasNext = false;
			this.hasPrev = false;
			return;
		}

		Long totalPage = totalCount / this.getPageSize();
		if (totalCount % this.getPageSize() != 0) {
			totalPage++;
		}

		Long totalBlock = totalPage / perBlock;
		if (totalPage % perBlock != 0) {
			totalBlock++;
		}

		Long curBlock = this.getCurrentPage() / perBlock;
		if (this.getCurrentPage() % perBlock != 0) {
			curBlock++;
		}

		this.startPage = (curBlock - 1) * perBlock + 1;
		this.endPage = curBlock * perBlock;

		if (curBlock.equals(totalBlock)) {
			this.endPage = totalPage;
			this.hasNext = false;
		}

		if (curBlock < 2) {
			this.hasPrev = false;
		}
	}
}
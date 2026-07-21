package com.health.app.checklnout;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PtMemberStatusDTO {

	private Long dataId;
	private Long username;
	private String memberName;
	private Integer totalCount;
	private Integer usedCount;
	private Integer remainingCount;
	private LocalDate startDate;
	private LocalDate endDate;

}

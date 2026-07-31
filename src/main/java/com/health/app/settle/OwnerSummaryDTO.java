package com.health.app.settle;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OwnerSummaryDTO {

	private long salesTotal;
	private long expenseTotal;
	private long commissionPaid;
	private long commissionPending;
	private long wagePaid;
	private long wagePending;

}

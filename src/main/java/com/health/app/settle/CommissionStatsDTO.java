package com.health.app.settle;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommissionStatsDTO {

	private long totalPaidAmount;
	private long unpaidCount;
	private double avgCommissionRate;

}

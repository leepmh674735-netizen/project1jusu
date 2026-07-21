package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Setter
@Getter
@ToString
public class CommissionDTO {

	private Long settlementId;
	private Long gymId;
	private Long commission;
	private Double commissionRate;
	private LocalDate settledAt;
	private LocalDate settleMonth;
	private String status;
	private Long expenseId;
	private String gymName;

}
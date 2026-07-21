package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ExpenseDTO {

	private Long expenseId;
	private Long gymId;
	private Long dataId;
	private String expenseName;
	private LocalDate expenseDate;
	private Long expensePrice;
	private double expenseRate;
	private Long originItemId;

}
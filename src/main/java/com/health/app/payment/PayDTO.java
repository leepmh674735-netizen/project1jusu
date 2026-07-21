package com.health.app.payment;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PayDTO {

	private Long pId;
	private Long dataId;
	private Long username;
	private Long pPrice;
	private Long couponId;
	private int installment;
	private String pName;
	private LocalDate createdAt;

}

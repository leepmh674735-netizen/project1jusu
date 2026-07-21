package com.health.app.payment;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Setter
@Getter
@ToString
public class PaymentDTO {

	private Long payId;
	private Long username;
	private Long gymId;
	private int payPrice;
	private LocalDate payDate;
	private String payName;
	private Long couponId;
	private String couponName;
	private Long discountAmount;

}

package com.health.app.payment;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PaymentDTO {

	private Long payId;
	private Long dataId;        // 👈 추가 (계약 PK 연동용)
	private Long username;
	private Long gymId;
	private Long payPrice;      // 👈 int -> Long 변경 (금액 타입 통일 및 null 허용)
	private Integer installment; // 👈 추가 (할부 개월 수: 0, 3, 6, 12 등)
	private LocalDate payDate;
	private String payName;
	private Long couponId;
	private String couponName;
	private Long discountAmount;

}
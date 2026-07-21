package com.health.app.coupon;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CouponDTO {

	private Long couponId;
	private Long fromId; 
	private Long toId;
	private LocalDate date;
	private Long couponNum;

	private String couponName;
	private String category;
	private Integer percent;
	private Integer maxAmount;
	private Integer couponCount;
	private Long gymId;

	private String fromName;
	private String toName;
	private Integer churnStatus;

}
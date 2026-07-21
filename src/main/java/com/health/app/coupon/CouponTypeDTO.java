package com.health.app.coupon;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CouponTypeDTO {

	private Long couponNum;
	private String category;
	private Integer percent;
	private String couponName;
	private Long gymId;
	private Integer maxAmount;
	private Integer couponCount;
	private Integer sendCount;

}

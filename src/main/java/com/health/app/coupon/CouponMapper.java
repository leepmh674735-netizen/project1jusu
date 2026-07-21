package com.health.app.coupon;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CouponMapper {

	List<CouponDTO> toList(@Param("username") Long username);

	int createCoupon(CouponTypeDTO couponTypeDTO);

	int sendCoupon(CouponDTO couponDTO);

	List<CouponTypeDTO> couponTypeList(@Param("gymId") Long gymId);

	int sendCount(@Param("couponNum") Long couponNum);

	CouponDTO getCouponById(@Param("couponId") Long couponId);

	int markUsed(@Param("couponId") Long couponId);

	List<CouponDTO> couponStatus(@Param("fromId") Long fromId);

	int updateExpiredCoupons();

	List<CouponDTO> getCouponsExpiringInDays(@Param("days") int days);

	List<CouponDTO> trialList(@Param("gymId") Long gymId);

	int checkDuplicateUnused(@Param("toId") Long toId, @Param("couponNum") Long couponNum);

	int claimChurnStatusToday(@Param("username") Long username);
}
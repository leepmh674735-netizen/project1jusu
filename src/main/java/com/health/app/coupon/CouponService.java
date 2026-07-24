package com.health.app.coupon;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CouponService {

	private final CouponMapper couponMapper;
	private final AlarmService alarmService;

	public List<CouponDTO> toList(Long username) throws Exception {
		return couponMapper.toList(username);
	}

	public int createCoupon(CouponTypeDTO typeDTO) throws Exception {
		return couponMapper.createCoupon(typeDTO);
	}

	public List<CouponTypeDTO> couponTypeList(Long gymId) throws Exception {
		return couponMapper.couponTypeList(gymId);
	}

	@Transactional
	public int sendCoupon(CouponDTO couponDTO) throws Exception {
		int dupCount = couponMapper.checkDuplicateUnused(couponDTO.getUsername(), couponDTO.getCouponNum());
		if (dupCount > 0) {
			throw new IllegalArgumentException("이미 사용하지 않은 동일한 쿠폰을 보유하고 있는 회원입니다.");
		}

		int result = couponMapper.sendCoupon(couponDTO);

		if (result > 0) {
			couponMapper.sendCount(couponDTO.getCouponNum());

			alarmService.sendAlarm(
				couponDTO.getUsername(),
				couponDTO.getFromId(),
				"새로운 쿠폰이 도착했습니다: " + couponDTO.getCouponName(),
				"/fitc/mypage/coupon",
				"COUPON"
			);
		}
		return result;
	}

	@Transactional
	public Map<String, Integer> sendToChurnMembers(Long fromId, Long couponNum, String couponName,
			LocalDate date, List<Long> usernames) throws Exception {
		int sent = 0;
		int skipped = 0;

		if (usernames != null) {
			for (Long username : usernames) {
				int claimed = couponMapper.claimChurnStatusToday(username);
				if (claimed == 0) {
					skipped++;
					continue;
				}

				CouponDTO dto = new CouponDTO();
				dto.setFromId(fromId);
				dto.setUsername(username);
				dto.setCouponNum(couponNum);
				dto.setCouponName(couponName);
				dto.setDate(date);

				couponMapper.sendCoupon(dto);
				couponMapper.sendCount(couponNum);
				alarmService.sendAlarm(
					username, fromId,
					"새로운 쿠폰이 도착했습니다: " + couponName,
					"/fitc/mypage/coupon",
					"COUPON"
				);
				sent++;
			}
		}

		Map<String, Integer> result = new HashMap<>();
		result.put("sent", sent);
		result.put("skipped", skipped);
		return result;
	}

	public CouponDTO getCouponById(Long couponId) throws Exception {
		return couponMapper.getCouponById(couponId);
	}

	public int markUsed(Long couponId) throws Exception {
		return couponMapper.markUsed(couponId);
	}

	public List<CouponDTO> couponStatus(Long fromId) throws Exception {
		return couponMapper.couponStatus(fromId);
	}

	public List<CouponDTO> trialList(Long gymId) throws Exception {
		return couponMapper.trialList(gymId);
	}

}
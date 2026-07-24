package com.health.app.coupon;

import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.health.app.alarm.AlarmService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CouponScheduler {

	private final CouponMapper couponMapper;
	private final AlarmService alarmService;

	@PostConstruct
	public void runOnStartup() {
		log.info("[쿠폰배치] 서버 구동 감지로 즉시 쿠폰 배치를 1회 초기 가동합니다.");
		this.handleCouponBatch();
	}

	@Scheduled(cron = "0 0 0 * * ?")
	public void handleCouponBatch() {
		try {
			log.info("[쿠폰배치] 자정 배치를 시작합니다.");

			List<CouponDTO> expiringSoon = couponMapper.getCouponsExpiringInDays(3);
			int alarmSendCount = 0;
			for (CouponDTO coupon : expiringSoon) {
				try {
					alarmService.sendAlarm(
						coupon.getUsername(),
						coupon.getFromId(),
						"['" + coupon.getCouponName() + "'] 쿠폰 만료가 3일 남았습니다. 서둘러 사용하세요.",
						"/mypage",
						"COUPON"
					);
					alarmSendCount++;
				} catch (Exception alarmEx) {
					log.error("[쿠폰배치] 회원 {} 알림 전송 실패: {}", coupon.getUsername(), alarmEx.getMessage());
				}
			}
			log.info("[쿠폰배치] 만료 3일 전 경고 알림 {}건 발송 완료", alarmSendCount);

			int expiredRows = couponMapper.updateExpiredCoupons();
			log.info("[쿠폰배치] 기간 경과 만료 처리 {}건 완료", expiredRows);

		} catch (Exception e) {
			log.error("[쿠폰배치] 배치 작업 중 심각한 예외 발생: ", e);
		}
	}

}
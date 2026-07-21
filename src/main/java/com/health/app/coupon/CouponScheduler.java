package com.health.app.coupon;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.health.app.alarm.AlarmService;
import jakarta.annotation.PostConstruct;

@Component
public class CouponScheduler {

	@Autowired
	private CouponMapper couponMapper;

	@Autowired
	private AlarmService alarmService;

	@PostConstruct
	public void runOnStartup() {
		System.out.println("[쿠폰배치] 서버 구동감지로 즉시 쿠폰 배치를 1회 초기 가동합니다.");
		this.handleCouponBatch();
	}

	@Scheduled(cron = "0 0 0 * * ?")
	public void handleCouponBatch() {
		try {
			System.out.println("[쿠폰배치] 자정 배치를 시작합니다.");

			List<CouponDTO> expiringSoon = couponMapper.getCouponsExpiringInDays(3);
			int alarmSendCount = 0;
			for (CouponDTO coupon : expiringSoon) {
				try {
					alarmService.sendAlarm(coupon.getToId(), coupon.getFromId(),
							"['" + coupon.getCouponName() + "'] 쿠폰 만료가 3일 남았습니다. 서둘러 사용하세요.", "/mypage", "COUPON");
					alarmSendCount++;
				} catch (Exception e) {
					System.err.println("[쿠폰배치] 회원 " + coupon.getToId() + " 알림 전송 실패: " + e.getMessage());
				}
			}
			System.out.println("[쿠폰배치] 만료 3일전 경고 알림 " + alarmSendCount + "건 발송 완료");

			int expiredRows = couponMapper.updateExpiredCoupons();
			System.out.println("[쿠폰배치] 기간 경과 만료 처리 " + expiredRows + "건 완료");

		} catch (Exception e) {
			System.err.println("[쿠폰배치] 배치 작업 중 심각한 예외 발생: " + e.getMessage());
		}
	}

}
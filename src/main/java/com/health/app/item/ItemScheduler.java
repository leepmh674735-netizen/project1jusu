package com.health.app.item;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@EnableScheduling
@RequiredArgsConstructor
public class ItemScheduler {

	private final ItemService itemService;

	@Scheduled(cron = "0 0 9 * * ?")
	public void scheduleExpiryCheck() {
		try {
			int count = itemService.checkExpiringItems();
			System.out.println("[유효기간 임박 알림]" + count + "건 발송 완료");
		} catch (Exception e) {
			System.err.println("[유효기간 임박 알림 실패] 에러: " + e.getMessage());
			e.printStackTrace();
		}
	}

}
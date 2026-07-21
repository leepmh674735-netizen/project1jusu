package com.health.app.alarm;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class AlarmScheduler {

	@Autowired
	private AlarmService alarmService;

	@Scheduled(cron = "0 10 0 * * *")
	public void delteOIdAlarms() {
		try {
			int count = alarmService.deleteOldAlarms();
			System.out.println("[알림 보관기간 정리] 1개월 경과 알림 " + count + "건 삭제 완료");
		} catch (Exception e) {
			System.out.println("[알림 보관기간 정리 실패] 에러: " + e.getMessage());
			e.printStackTrace();
		}
	}

}

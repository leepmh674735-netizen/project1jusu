package com.health.app.checkInout;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AttendanceScheduler {

	@Autowired
	private CheckInoutService checkInoutService;

	@Scheduled(cron = "0 0 20 * * *")
	public void sendTomorrowReminders() {
		try {
			int count = checkInoutService.sendTomorrowReminders();
			System.out.println("[PT 수업 리마인드] 내일 예정 일정 " + count + "건 알림 발송 완료");
		} catch (Exception e) {
			System.err.println("[PT 수업 리마인드 실패] 에러: " + e.getMessage());
			e.printStackTrace();
		}
	}

}
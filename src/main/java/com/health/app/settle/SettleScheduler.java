package com.health.app.settle;

import java.time.LocalDate;
import java.util.List;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettleScheduler {

    private final SettleService settleService;
    private final AlarmService alarmService;
    private final MemberService memberService;

    public void notifyAdminsOfFailure(String targetMonth, String errorMessage) {
        List<MemberDTO> admins;
        try {
            admins = memberService.findByRole("admin");
        } catch (Exception e) {
            log.error("ADMIN 목록 조회 실패: {}", e.getMessage(), e);
            return;
        }

        for (MemberDTO admin : admins) {
            try {
                alarmService.sendAlarm(
                    admin.getUsername(), 
                    null, 
                    targetMonth + " 정산 배치 실패 - 확인이 필요합니다. (" + errorMessage + ")",
                    "/fitb/Settlepage", 
                    "SETTLE_BATCH"
                );
            } catch (Exception notifyError) {
                log.error("정산 배치 실패 알림 발송 중 에러 (admin={}): {}", admin.getUsername(), notifyError.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 0 1 * *")
    public void scheduleMonthlySettlement() {
        LocalDate targetMonth = LocalDate.now().minusMonths(1);
        String monthStr = String.format("%d-%02d", targetMonth.getYear(), targetMonth.getMonthValue());
        
        try {
            int count = settleService.generateMonthlyCommissions(targetMonth);
            log.info("Scheduler execute success: Generated {} commissions for month: {}", count, monthStr);
        } catch (Exception e) {
            log.error("Scheduler execution failed for month {}: {}", monthStr, e.getMessage(), e);
            notifyAdminsOfFailure(monthStr, e.getMessage());
        }
    }

    @Scheduled(cron = "0 15 0 * * *")
    public void scheduleNewExpenseContractCheck() {
        try {
            int count = settleService.checkNewlyExpenseContracts();
            log.info("[신규 지출 정산 대기 알림] {}건 발송 완료", count);
        } catch (Exception e) {
            log.error("[신규 지출 정산 대기 알림 실패] 에러: {}", e.getMessage(), e);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        try {
            LocalDate prevMonth = LocalDate.now().minusMonths(1);
            String prevMonthStr = String.format("%d-%02d", prevMonth.getYear(), prevMonth.getMonthValue());
            int prevCount = settleService.generateMonthlyCommissions(prevMonth);

            LocalDate currentMonth = LocalDate.now();
            String currentMonthStr = String.format("%d-%02d", currentMonth.getYear(), currentMonth.getMonthValue());
            int currentCount = settleService.generateMonthlyCommissions(currentMonth);

            log.info("[서버기동정산 완료] 전월({}): {}건 / 당월({}): {}건이 생성/업데이트 되었습니다.",
                    prevMonthStr, prevCount, currentMonthStr, currentCount);
        } catch (Exception e) {
            log.error("[서버기동정산 실패] 에러: {}", e.getMessage(), e);
        }
    }
}
package com.health.app.settle;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettleService {

    private final SettleMapper settleMapper;
    private final AlarmService alarmService;
    private final MemberService memberService;

    private Long resolveOwnerReceiver(Long gymId) {
        if (gymId == null) {
            return null;
        }
        try {
            MemberDTO owner = memberService.findOwnerByGymId(gymId);
            return owner != null ? owner.getUsername() : null;
        } catch (Exception e) {
            log.error("gym 사장님 계정 조회 실패 (gymId={}): {}", gymId, e.getMessage());
            return null;
        }
    }

    private void sendAlarmSafely(Long receiver, String message, String link, String category) {
        try {
            alarmService.sendAlarm(receiver, null, message, link, category);
        } catch (Exception e) {
            log.error("알림 발송 실패 (receiver={}, category={}): {}", receiver, category, e.getMessage());
        }
    }

    @Transactional
    public boolean recalcCommissionAfterPaymentDeleted(Long gymId, LocalDate payDate) throws Exception {
        LocalDate monthStart = payDate.withDayOfMonth(1);
        
        CommissionDTO settlement = settleMapper.getCommissionByGymMonth(gymId, monthStart);
        if (settlement == null) {
            return false;
        }
        if ("지급".equals(settlement.getStatus())) {
            Long receiver = resolveOwnerReceiver(gymId);
            if (receiver != null) {
                sendAlarmSafely(receiver,
                        "이미 지급 완료된 정산 금액이라 매출 삭제가 자동 반영되지 않았습니다. 확인이 필요합니다.",
                        "/fitb/Settlepage", "SETTLE_RECALC");
            }
            return true;
        }

        LocalDate monthEnd = monthStart.with(TemporalAdjusters.lastDayOfMonth());
        
        Long newCommission = settleMapper.sumGymSalesForMonth(gymId, monthStart, monthEnd, settlement.getCommissionRate());
        settleMapper.updateCommissionAmount(settlement.getSettlementId(), newCommission != null ? newCommission : 0L);

        return false;
    }

    public PagedResponse<CommissionDTO> commissionList(Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<CommissionDTO> items = settleMapper.commissionList(pager, sort);
        long totalCount = settleMapper.commissionListCount(pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, 0L);
    }

    public List<CommissionDTO> commissionListAll(Pager pager) throws Exception {
        return settleMapper.commissionListAll(pager);
    }

    public CommissionStatsDTO commissionStats() throws Exception {
        return settleMapper.commissionStats();
    }

    @Transactional
    public int toggleCommissionStatus(Long settlementId) throws Exception {
        CommissionDTO commission = settleMapper.getCommissionById(settlementId);
        if (commission != null) {
            if ("지급".equals(commission.getStatus())) {
                commission.setStatus("미지급");
                commission.setSettledAt(null);
            } else {
                commission.setStatus("지급");
                commission.setSettledAt(LocalDate.now());
            }
            return settleMapper.updateCommissionStatus(commission);
        }
        return 0;
    }

    public PagedResponse<ExpenseDTO> expenseList(Long username, Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<ExpenseDTO> items = settleMapper.expenseList(username, pager, sort);
        long totalCount = settleMapper.expenseListCount(username, pager);
        long totalAmount = settleMapper.expenseListSum(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, totalAmount);
    }

    public List<ExpenseDTO> expenseListAll(Long username, Pager pager) throws Exception {
        return settleMapper.expenseListAll(username, pager);
    }

    @Transactional
    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception {
        int result = settleMapper.expenseAdd(expenseDTO);
        if (result > 0 && expenseDTO.getDataId() != null) {
            settleMapper.updateSettlementStatusContract(expenseDTO.getDataId(), expenseDTO.getExpenseId());
        }
        return result;
    }

    public int expenseDelete(Long expenseId) throws Exception {
        int linkedCount = settleMapper.checkExpenseLinkedToSettlement(expenseId);
        if (linkedCount > 0) {
            return -2;
        }
        return settleMapper.expenseDelete(expenseId);
    }

    @Transactional
    public int generateMonthlyCommissions(LocalDate settleMonth) throws Exception {
        LocalDate startDate = settleMonth.withDayOfMonth(1);
        LocalDate endDate = settleMonth.with(TemporalAdjusters.lastDayOfMonth());

        List<CommissionDTO> calculatedList = settleMapper.calculateMonthlyGymSales(startDate, endDate);

        int insertCount = 0;
        for (CommissionDTO item : calculatedList) {
            int count = settleMapper.checkCommissionExists(item.getGymId(), startDate);
            if (count == 0) {
                item.setSettleMonth(startDate);
                item.setStatus("미지급");
                int result = settleMapper.insertCommission(item);
                if (result > 0) {
                    insertCount++;

                    Long receiver = resolveOwnerReceiver(item.getGymId());
                    if (receiver != null) {
                        String message = String.format("%d년 %d월 정산이 생성되었습니다. (수수료 %,d원)",
                                startDate.getYear(), startDate.getMonthValue(), item.getCommission());
                        sendAlarmSafely(receiver, message, "/fitb/Settlepage", "SETTLE_BATCH");
                    }
                }
            }
        }
        return insertCount;
    }

    @Transactional
    public int generateMonthlyCommission(String settleMonth) throws Exception {
        if (settleMonth == null || settleMonth.trim().isEmpty()) {
            throw new IllegalArgumentException("settleMonth is required");
        }
        
        LocalDate parsedDate;
        try {
            if (settleMonth.length() <= 7) {
                parsedDate = YearMonth.parse(settleMonth).atDay(1);
            } else {
                parsedDate = LocalDate.parse(settleMonth);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("올바르지 않은 날짜 형식입니다.");
        }
        
        return generateMonthlyCommissions(parsedDate);
    }

    public PagedResponse<ContractDTO> unpaidExpenseContractList(Long username, Pager pager) throws Exception {
        pager.makeOffset();
        List<ContractDTO> items = settleMapper.unpaidExpenseContractList(username, pager);
        
        long totalCount = settleMapper.unpaidExpenseContract(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, 0L);
    }

    public int checkNewlyExpenseContracts() throws Exception {
        List<ContractDTO> newlySigned = settleMapper.newlySignedExpenseExpnesContracts();

        int sentCount = 0;
        for (ContractDTO contract : newlySigned) {
            Long receiver = resolveOwnerReceiver(contract.getGymId());
            if (receiver == null) {
                continue;
            }
            String message = String.format("신규 지출 정산 대기 계약서가 발생했습니다: %s", contract.getReceiverName());
            sendAlarmSafely(receiver, message, "/fitb/Settlepage", "CONTRACT_WAIT");
            sentCount++;
        }
        return sentCount;
    }
}
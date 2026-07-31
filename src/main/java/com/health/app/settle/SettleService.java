package com.health.app.settle;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.alarm.AlarmService;
import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;

@Service
public class SettleService {

    @Autowired
    private SettleMapper settleMapper;

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private MemberService memberService;

    private Long resolveOwnerReceiver(Long gymId) {
        if (gymId == null) {
            return null;
        }
        try {
            MemberDTO owner = memberService.findOwnerByGymId(gymId);
            return owner != null ? owner.getUsername() : null;
        } catch (Exception e) {
            System.err.println("gym 사장님 계정 조회 실패 (gymId=" + gymId + "): " + e.getMessage());
            return null;
        }
    }

    private void sendAlarmSafely(Long receiver, String message, String link, String category) {
        try {
            alarmService.sendAlarm(receiver, null, message, link, category);
        } catch (Exception e) {
            System.err.println("알림 발송 실패 (receiver=" + receiver + ", category=" + category + "): " + e.getMessage());
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public boolean recalcCommissionAfterPaymentDeleted(Long gymId, java.time.LocalDate payDate) throws Exception {
        java.time.LocalDate monthStart = payDate.withDayOfMonth(1);
        CommissionDTO settlement = settleMapper.getCommissionByGymAndMonth(gymId, monthStart);
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

        java.time.LocalDate monthEnd = monthStart.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
        long newCommission = settleMapper.sumGymSalesForMonth(gymId, monthStart, monthEnd, settlement.getCommissionRate());
        settleMapper.updateCommissionAmount(settlement.getSettlementId(), newCommission);

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

    public OwnerSummaryDTO ownerSettleSummary(Long username, String month) throws Exception {
        return settleMapper.ownerSettleSummary(username, month);
    }

    public List<CommissionDTO> ownerUnpaidCommissionList(Long username) throws Exception {
        return settleMapper.ownerUnpaidCommissionList(username);
    }

    public PagedResponse<ExpenseDTO> expenseList(Long username, String role, Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<ExpenseDTO> items = settleMapper.expenseList(username, role, pager, sort);
        long totalCount = settleMapper.expenseListCount(username, role, pager);
        long totalAmount = settleMapper.expenseListSum(username, role, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, totalAmount);
    }

    public List<ExpenseDTO> expenseListAll(Long username, String role, Pager pager) throws Exception {
        return settleMapper.expenseListAll(username, role, pager);
    }

    @org.springframework.transaction.annotation.Transactional
    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception {
        return settleMapper.expenseAdd(expenseDTO);
    }

    @org.springframework.transaction.annotation.Transactional
    public int expenseAddForOwner(Long username, ExpenseDTO expenseDTO) throws Exception {
        Long ownerGymId = settleMapper.getOwnerGymId(username);
        if (ownerGymId == null) {
            throw new IllegalArgumentException("소속 사업장을 확인할 수 없습니다.");
        }
        expenseDTO.setGymId(ownerGymId);

        if (expenseDTO.getSettlementId() != null) {
            CommissionDTO settlement = settleMapper.getOwnerUnpaidCommission(username, expenseDTO.getSettlementId());
            if (settlement == null) {
                throw new IllegalArgumentException("본인 사업장의 미지급 커미션이 아니거나 이미 지급된 정산입니다.");
            }

            expenseDTO.setDataId(null);
            expenseDTO.setExpenseName(String.format("[%s] 플랫폼 커미션", settlement.getSettleMonth()));
            
            long calculatedPrice = (long)(settlement.getCommission() * (1 + settlement.getCommissionRate()));
            expenseDTO.setExpensePrice(calculatedPrice);
            expenseDTO.setExpenseRate(settlement.getCommissionRate());
        } else if (expenseDTO.getDataId() != null) {
            settleMapper.lockExpenseContract(expenseDTO.getDataId());
            if (settleMapper.checkOwnerExpenseContract(username, expenseDTO.getDataId()) != 1) {
                throw new IllegalArgumentException("본인이 지급할 수 있는 미지급 임금 계약이 아닙니다.");
            }
        }

        if (expenseDTO.getExpenseDate() == null
                || expenseDTO.getExpenseName() == null
                || expenseDTO.getExpenseName().isBlank()
                || expenseDTO.getExpensePrice() == null
                || expenseDTO.getExpensePrice() <= 0) {
            throw new IllegalArgumentException("지출 항목명, 결제일, 금액을 올바르게 입력해 주세요.");
        }

        int result = settleMapper.expenseAdd(expenseDTO);
        if (result <= 0) {
            throw new IllegalStateException("지출 등록에 실패했습니다.");
        }

        if (expenseDTO.getSettlementId() != null
                && settleMapper.markSettlementPaid(
                        expenseDTO.getSettlementId(), expenseDTO.getExpenseId(), expenseDTO.getExpenseDate()) != 1) {
            throw new IllegalArgumentException("커미션이 이미 지급되었거나 상태가 변경되었습니다.");
        }
        return result;
    }

    @org.springframework.transaction.annotation.Transactional
    public int expenseDelete(Long username, Long expenseId) throws Exception {
        int resetCount = settleMapper.resetSettlementForExpense(username, expenseId);
        int deleteCount = settleMapper.expenseDelete(username, expenseId);
        if (resetCount > 0 && deleteCount <= 0) {
            throw new IllegalStateException("커미션 정산 복구 중 지출 삭제에 실패했습니다.");
        }
        return deleteCount;
    }

    @org.springframework.transaction.annotation.Transactional
    public int generateMonthlyCommissions(java.time.LocalDate settleMonth) throws Exception {
        java.time.LocalDate startDate = settleMonth.withDayOfMonth(1);
        java.time.LocalDate currentMonth = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).withDayOfMonth(1);
        if (!startDate.isBefore(currentMonth)) {
            throw new IllegalArgumentException("완료된 이전 달의 매출만 커미션으로 집계할 수 있습니다.");
        }
        java.time.LocalDate endDate = settleMonth.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());

        List<CommissionDTO> calculatedList = settleMapper.calculateMonthlyGymSales(startDate, endDate);

        int insertCount = 0;
        for (CommissionDTO item : calculatedList) {
            settleMapper.lockCommissionGeneration(item.getGymId());
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

    public PagedResponse<ContractDTO> unpaidExpenseContractList(Long username, Pager pager) throws Exception {
        pager.makeOffset();
        List<ContractDTO> items = settleMapper.unpaidExpenseContractList(username, pager);
        long totalCount = settleMapper.unpaidExpenseContractListCount(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, 0L);
    }

    public int checkNewlySignedExpenseContracts() throws Exception {
        List<ContractDTO> newlySigned = settleMapper.newlySignedExpenseContracts();

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
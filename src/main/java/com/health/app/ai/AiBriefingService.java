package com.health.app.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.complaint.ComplaintDTO;
import com.health.app.complaint.ComplaintService;
import com.health.app.contract.ContractDTO;
import com.health.app.dashboard.DashboardMapper;
import com.health.app.pager.Pager;
import com.health.app.pager.PagedResponse;
import com.health.app.payment.PaymentService;
import com.health.app.settle.SettleService;

@Service
public class AiBriefingService {

    private static final int RANDOM_PICK = 3;

    @Autowired
    private DashboardMapper dashboardMapper;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private SettleService settleService;

    @Autowired
    private ComplaintService complaintService;

    public Map<String, Object> briefing(AuthContext ctx, boolean all) throws Exception {

        Map<String, Object> result = new LinkedHashMap<>();
        
        if (ctx == null || ctx.getGymId() == null || ctx.getUsername() == null) {
            result.put("items", Collections.emptyList());
            return result;
        }

        List<Map<String, Object>> candidates = new ArrayList<>();

        Map<String, Object> churn = dashboardMapper.ownerChurnSummary(ctx.getGymId());
        long highRisk = 0;
        if (churn != null) {
            Object riskVal = churn.get("highRiskCount");
            if (riskVal == null) {
                riskVal = churn.get("HIGH_RISK_COUNT");
            }
            highRisk = numberOf(riskVal);
        }
        
        if (highRisk > 0) {
            candidates.add(item("churn", "이탈 예방하기", highRisk, "danger", "/fitb/dashboard"));
        }

        List<Map<String, Object>> expiring = dashboardMapper.ownerExpiringContract(ctx.getGymId());
        if (expiring != null && !expiring.isEmpty()) {
            candidates.add(item("expiring", "계약서 작성하기 (만료 임박)", expiring.size(), "warning", "/fitb/contractpage"));
        }

        List<ContractDTO> unpaid = paymentService.unpaidContractList(ctx.getUsername());
        if (unpaid != null && !unpaid.isEmpty()) {
            candidates.add(item("unpaid", "미결제 확인하기", unpaid.size(), "warning", "/fitb/dashboard"));
        }

        Pager pager = new Pager();
        pager.setCurrentPage(1L);
        pager.setPageSize(200L);
        
        PagedResponse<ContractDTO> unpaidExpense = settleService.unpaidExpenseContractList(ctx.getUsername(), pager);
        long commissionCount = 0;
        long wageCount = 0;
        
        if (unpaidExpense != null && unpaidExpense.getItems() != null) {
            for (ContractDTO row : unpaidExpense.getItems()) {
                if (row.getContract() != null) {
                    if (row.getContract() == 1L) {
                        commissionCount++;
                    } else if (row.getContract() == 2L) {
                        wageCount++;
                    }
                }
            }
        }
        
        if (commissionCount > 0 || wageCount > 0) {
            Map<String, Object> bundle = item("expense", "지출 내역 확인", commissionCount + wageCount, "warning", null);
            List<Map<String, Object>> subItems = new ArrayList<>();
            if (commissionCount > 0) {
                subItems.add(item("commission", "커미션 지급", commissionCount, "warning", "/fitb/dashboard"));
            }
            if (wageCount > 0) {
                subItems.add(item("wage", "월급 지급", wageCount, "warning", "/fitb/dashboard"));
            }
            bundle.put("bundle", subItems);
            candidates.add(bundle);
        }

        List<ComplaintDTO> complaints = complaintService.ownerList(ctx.getGymId());
        long openComplaints = 0;
        if (complaints != null) {
            openComplaints = complaints.stream()
                    .filter(c -> c != null && c.getStatus() != null && !"처리완료".equals(c.getStatus().trim()))
                    .count();
        }
        
        if (openComplaints > 0) {
            candidates.add(item("complaint", "미처리 건의사항", openComplaints, "warning", "/fitb/b2mypage/b2bComplaint"));
        }

        List<Map<String, Object>> items = candidates;
        if (!all && candidates.size() > RANDOM_PICK) {
            List<Map<String, Object>> shuffled = new ArrayList<>(candidates);
            Collections.shuffle(shuffled);
            items = new ArrayList<>(shuffled.subList(0, RANDOM_PICK));
        }

        result.put("items", items);
        return result;
    }

    private Map<String, Object> item(String key, String label, long count, String tone, String linkTo) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("key", key);
        map.put("label", label);
        map.put("count", count);
        map.put("tone", tone);
        if (linkTo != null && !linkTo.isBlank()) {
            map.put("linkTo", linkTo);
        }
        return map;
    }

    private long numberOf(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
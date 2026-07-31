package com.health.app.settle;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

@Mapper
public interface SettleMapper {

    public List<CommissionDTO> commissionList(@Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    public long commissionListCount(@Param("pager") Pager pager) throws Exception;

    public List<CommissionDTO> commissionListAll(@Param("pager") Pager pager) throws Exception;

    public CommissionStatsDTO commissionStats() throws Exception;

    public OwnerSummaryDTO ownerSettleSummary(@Param("username") Long username, @Param("month") String month) throws Exception;

    public List<CommissionDTO> ownerUnpaidCommissionList(@Param("username") Long username) throws Exception;

    public CommissionDTO getOwnerUnpaidCommission(
            @Param("username") Long username,
            @Param("settlementId") Long settlementId) throws Exception;

    public Long getOwnerGymId(@Param("username") Long username) throws Exception;

    public CommissionDTO getCommissionByGymAndMonth(
            @Param("gymId") Long gymId,
            @Param("month") java.time.LocalDate month) throws Exception;

    public long sumGymSalesForMonth(
            @Param("gymId") Long gymId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("rate") double rate) throws Exception;

    public int updateCommissionAmount(
            @Param("settlementId") Long settlementId,
            @Param("commission") long commission) throws Exception;

    public List<ExpenseDTO> expenseList(@Param("username") Long username, @Param("role") String role, @Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    public long expenseListCount(@Param("username") Long username, @Param("role") String role, @Param("pager") Pager pager) throws Exception;

    public long expenseListSum(@Param("username") Long username, @Param("role") String role, @Param("pager") Pager pager) throws Exception;

    public List<ExpenseDTO> expenseListAll(@Param("username") Long username, @Param("role") String role, @Param("pager") Pager pager) throws Exception;

    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception;

    public int markSettlementPaid(
            @Param("settlementId") Long settlementId,
            @Param("expenseId") Long expenseId,
            @Param("settledAt") java.time.LocalDate settledAt) throws Exception;

    public int checkOwnerExpenseContract(
            @Param("username") Long username,
            @Param("dataId") Long dataId) throws Exception;

    public Long lockExpenseContract(@Param("dataId") Long dataId) throws Exception;

    public int expenseDelete(@Param("username") Long username, @Param("expenseId") Long expenseId) throws Exception;

    public int resetSettlementForExpense(
            @Param("username") Long username,
            @Param("expenseId") Long expenseId) throws Exception;

    public List<CommissionDTO> calculateMonthlyGymSales(
            @Param("startDate") java.time.LocalDate startDate, 
            @Param("endDate") java.time.LocalDate endDate) throws Exception;

    public int checkCommissionExists(
            @Param("gymId") Long gymId, 
            @Param("settleMonth") java.time.LocalDate settleMonth) throws Exception;

    public Long lockCommissionGeneration(@Param("gymId") Long gymId) throws Exception;

    public int insertCommission(CommissionDTO commissionDTO) throws Exception;

    public List<ContractDTO> unpaidExpenseContractList(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    public long unpaidExpenseContractListCount(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    public List<ContractDTO> newlySignedExpenseContracts() throws Exception;

}
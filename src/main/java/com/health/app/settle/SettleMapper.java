package com.health.app.settle;

import java.time.LocalDate;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

@Mapper
public interface SettleMapper {
	
	public List<CommissionDTO> commissionList(
			@Param("pager") Pager pager, 
			@Param("sort") String sort) throws Exception;
	
	public long commissionListCount(@Param("pager") Pager pager) throws Exception;
	
	public List<CommissionDTO> commissionListAll(@Param("pager") Pager pager) throws Exception;
	
	public CommissionStatsDTO commissionStats() throws Exception;
	
	public CommissionDTO getCommissionById(Long settlementId) throws Exception;
	
	public CommissionDTO getCommissionByGymMonth(  
			@Param("gymId") Long gymId,
			@Param("month") LocalDate month) throws Exception;
	
	public Long sumGymSalesForMonth(  
			@Param("gymId") Long gymId,
			@Param("startDate") LocalDate startDate,
			@Param("endDate") LocalDate endDate,
			@Param("rate") Double rate) throws Exception;
	
	public int updateCommissionAmount(
			@Param("settlementId") Long settlementId,
			@Param("commission") long commission) throws Exception;

	public int updateCommissionStatus(CommissionDTO commission) throws Exception;
	
	public List<ExpenseDTO> expenseList(
			@Param("username") Long username, 
			@Param("pager") Pager pager, 
			@Param("sort") String sort) throws Exception;
	
	public long expenseListCount(
			@Param("username") Long username,
			@Param("pager") Pager pager) throws Exception;
	
	public long expenseListSum(
			@Param("username") Long username,
			@Param("pager") Pager pager) throws Exception;
	
	public List<ExpenseDTO> expenseListAll(
			@Param("username") Long username,  
			@Param("pager") Pager pager) throws Exception;
	
	public int expenseAdd(ExpenseDTO expenseDTO) throws Exception;
	
	public int expenseDelete(Long expenseId) throws Exception;
	
	public int checkExpenseLinkedToSettlement(Long expenseId) throws Exception;
	
	public List<CommissionDTO> calculateMonthlyGymSales(
			@Param("startDate") LocalDate startDate,
			@Param("endDate") LocalDate endDate) throws Exception;
	
	public int checkCommissionExists(
			@Param("gymId") Long gymId,
			@Param("settleMonth") LocalDate settleMonth) throws Exception;
	
	public int insertCommission(CommissionDTO commissionDTO) throws Exception;
	
	public List<ContractDTO> unpaidExpenseContractList(
			@Param("username") Long username, 
			@Param("pager") Pager pager) throws Exception;
	
	public long unpaidExpenseContract(
			@Param("username") Long username, 
			@Param("pager") Pager pager) throws Exception;
	
	public int updateSettlementStatusContract( 
			@Param("dataId") Long dataId,
			@Param("expenseId") Long expenseId) throws Exception;
	
	public List<ContractDTO> newlySignedExpenseExpnesContracts() throws Exception;

}
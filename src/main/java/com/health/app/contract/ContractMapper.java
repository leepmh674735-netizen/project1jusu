package com.health.app.contract;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.member.MemberDTO;
import com.health.app.pager.Pager;

@Mapper
public interface ContractMapper {

	public List<ContractDTO> contractUserListPage(@Param("contractDTO") ContractDTO contractDTO, @Param("pager") Pager pager) throws Exception;

	public long contractUserListCount(ContractDTO contractDTO) throws Exception;

	public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception;

	public int contractInsert(ContractDTO contractDTO) throws Exception;

	public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception;

	public int contractSign(ContractDTO contractDTO) throws Exception;

	public int contractExpireSweep() throws Exception;

	public int contractSweep() throws Exception;
	
	public int contractActivateSweep() throws Exception;

	public int contractActive(ContractDTO contractDTO) throws Exception;

	public List<TrialTargetDTO> trialTargetList(ContractDTO contractDTO) throws Exception;

	public ContractDTO activeBaseContractFind(ContractDTO contractDTO) throws Exception;

	public ContractDTO activeTrialContractFind(ContractDTO contractDTO) throws Exception;

	public int trialCouponValidate(ContractDTO contractDTO) throws Exception;

	public int contractTerminate(ContractDTO contractDTO) throws Exception;

	public ContractDTO wageContractFind(ContractDTO contractDTO) throws Exception;

	public int wageContractUpdate(ContractDTO contractDTO) throws Exception;

	public List<MemberDTO> jobSeekingTrainers() throws Exception;

	public List<ContractDTO> rosterGymList() throws Exception;

	public List<ContractDTO> rosterMemberList(ContractDTO contractDTO) throws Exception;

	public List<ContractDTO> rosterManagedList(ContractDTO contractDTO) throws Exception;

}
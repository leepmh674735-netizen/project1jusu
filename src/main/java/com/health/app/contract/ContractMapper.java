package com.health.app.contract;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.health.app.member.MemberDTO;

@Mapper
public interface ContractMapper {

	public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception;

	public int contractInsert(ContractDTO contractDTO) throws Exception;

	public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception;

	public int contractSign(ContractDTO contractDTO) throws Exception;

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
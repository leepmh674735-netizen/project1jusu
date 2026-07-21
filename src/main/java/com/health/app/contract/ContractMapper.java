package com.health.app.contract;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.health.app.member.MemberDTO;

@Mapper
public interface ContractMapper {

	public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception;

	public int contractInsert(ContractDTO contractDTO) throws Exception;

	public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception;

	public int coutractSign(ContractDTO contractDTO) throws Exception;

	public int contactExpireSweep() throws Exception;
	
	public int contratActivateSweep() throws Exception;

	public int contractActive(ContractDTO contactDTO) throws Exception;

	public List<TrialTargetDTO> trailTagetList(ContractDTO contractDTO) throws Exception;

	public ContractDTO activrBaseContractFind(ContractDTO contractDTO) throws Exception;

	public ContractDTO activerTrialContractFind(ContractDTO contractDTO) throws Exception;

	public int trialCouponValidate(ContractDTO contractDTO) throws Exception;

	public int contractTeminate(ContractDTO contractDTO) throws Exception;

	public int wageCoutractUpdate(ContractDTO contractDTO) throws Exception;

	public List<MemberDTO> jobSeekingTrainers() throws Exception;

	public List<ContractDTO> rosterGymList() throws Exception;

	public List<ContractDTO> rosterMemberList(ContractDTO contractDTO) throws Exception;

	public List<ContractDTO> rosterManagedList(ContractDTO contractDTO) throws Exception;

}

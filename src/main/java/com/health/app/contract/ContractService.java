package com.health.app.contract;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;
import com.health.app.member.MemberService;

@Service
public class ContractService {

	@Autowired
	private ContractMapper contractMapper;

	@Autowired
	private MemberMapper memberMapper;

	@Autowired
	private MemberService memberService;

	private Long toEightDigits(Long phone) {
		if (phone == null)
			return null;
		String phoneStr = String.valueOf(phone);
		if (phoneStr.length() > 8) {
			phoneStr = phoneStr.substring(phoneStr.length() - 8);
		}
		return Long.parseLong(phoneStr);
	}

	private void contractSweep() throws Exception {
		contractMapper.contractSweep();
		contractMapper.contractActivateSweep();
	}

	@Transactional
	public int contractActive(ContractDTO contractDTO) throws Exception {
		ContractDTO detail = contractMapper.contractDetail(contractDTO);
		if (detail == null) {
			return -1;
		}

		String senderIdStr = detail.getSenderId();
		Long senderId = (senderIdStr != null) ? Long.parseLong(senderIdStr) : null;

		// ⭐ Long 타입으로 변환 후 비교하여 에러 해결
		Long loginId = contractDTO.getUsernameAsLong();
		if (loginId == null || !loginId.equals(senderId)) {
			return -2;
		}

		if (!"SIGNED".equals(detail.getStatus())) {
			return -3;
		}

		if (detail.getStartDate() == null || !detail.getStartDate().isAfter(java.time.LocalDate.now())) {
			return contractMapper.contractActive(contractDTO);
		}
		return -1;
	}

	public List<TrialTargetDTO> trialTargetList(ContractDTO contractDTO) throws Exception {
		String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
		if (!"OWNER".equals(role)) {
			return null;
		}

		contractSweep();

		MemberDTO find = new MemberDTO();
		// ⭐ getUsernameAsLong()을 사용하여 MemberDTO(Long) 타입과 맞춤
		find.setUsername(contractDTO.getUsernameAsLong());
		MemberDTO owner = memberMapper.idCheck(find);
		contractDTO.setGymId(owner != null && owner.getGymId() != null ? owner.getGymId() : -1L);

		return contractMapper.trialTargetList(contractDTO);
	}

	public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception {
		String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
		contractDTO.setRole(role);

		if (role == null || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
			return null;
		}

		contractSweep();

		return contractMapper.contractUserList(contractDTO);
	}

	public List<MemberDTO> ownerList(String role) throws Exception {
		String upperRole = role == null ? null : role.toUpperCase();
		if (!"ADMIN".equals(upperRole)) {
			return null;
		}

		List<MemberDTO> owners = memberService.findByRole("OWNER");
		for (MemberDTO owner : owners) {
			owner.setPassword(null);
			owner.setPasswordCheck(null);
		}
		return owners;
	}

	@Transactional
	public int contractInsert(ContractDTO contractDTO) throws Exception {
		String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
		Long contract = contractDTO.getContract();

		if (contract != null && (contract == 3 || contract == 4)) {
			Integer quantity = contractDTO.getQuantity();
			if (quantity != null && quantity < 0) {
				return -6;
			}
			contract = (quantity == null || quantity == 0) ? 3L : 4L;
			contractDTO.setContract(contract);
		}

		boolean allowed = ("ADMIN".equals(role) && Long.valueOf(1).equals(contract)) || ("OWNER".equals(role)
				&& contract != null && (contract == 2 || contract == 3 || contract == 4 || contract == 5));
		if (!allowed) {
			return -1;
		}

		if (contractDTO.getReceiverName() == null || contractDTO.getReceiverName().isBlank()) {
			return -2;
		}

		if (Long.valueOf(5).equals(contract) && contractDTO.getReceiverId() == null) {
			return -2;
		}

		MemberDTO find = new MemberDTO();
		String senderId = contractDTO.getSenderId();
		Long targetUsername = "ADMIN".equals(role) ? contractDTO.getReceiverId()
				: (senderId != null ? Long.parseLong(senderId) : null);
		find.setUsername(targetUsername);

		if (find.getUsername() != null) {
			MemberDTO gymOwner = memberMapper.idCheck(find);
			if (gymOwner != null) {
				contractDTO.setGymId(gymOwner.getGymId());
			}
		}

		if (contractDTO.getReceiverId() != null) {
			contractDTO.setReceiverId(toEightDigits(contractDTO.getReceiverId()));
		}

		if (contractDTO.getManagerId() != null) {
			contractDTO.setManagerId(toEightDigits(contractDTO.getManagerId()));
		}

		if (Long.valueOf(2).equals(contract) && contractDTO.getReceiverId() != null) {
			ContractDTO existWage = contractMapper.wageContractFind(contractDTO);
			if (existWage != null) {
				contractDTO.setDataId(existWage.getDataId());
				return contractMapper.wageContractUpdate(contractDTO);
			}
		}

		if (contract != null && contract >= 3 && contractDTO.getReceiverId() != null) {
			ContractDTO activeBase = contractMapper.activeBaseContractFind(contractDTO);
			ContractDTO activeTrial = contractMapper.activeTrialContractFind(contractDTO);

			if (contract == 5) {
				if (contractDTO.getSourceCouponId() == null || contractMapper.trialCouponValidate(contractDTO) == 0) {
					return -8;
				}
				if (activeTrial != null) {
					return -7;
				}
			}

			if (activeBase != null) {
				contractDTO.setRelatedDateId(activeBase.getDataId());
				contractMapper.contractTerminate(activeBase);
				contractDTO.setPreviousDataId(activeBase.getDataId());
			}
		}

		contractDTO.setStatus("ISSUED");
		return contractMapper.contractInsert(contractDTO);
	}

	public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception {
		contractSweep();

		ContractDTO detail = contractMapper.contractDetail(contractDTO);
		if (detail == null) {
			return null;
		}

		String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
		// ⭐ getUsernameAsLong() 사용
		Long loginId = contractDTO.getUsernameAsLong();

		String senderIdStr = detail.getSenderId();
		Long senderId = (senderIdStr != null) ? Long.parseLong(senderIdStr) : null;

		boolean party = loginId != null && (loginId.equals(senderId) || loginId.equals(detail.getReceiverId())
				|| loginId.equals(detail.getManagerId()));
		if (!"ADMIN".equals(role) && !party) {
			return null;
		}
		return detail;
	}

	@Transactional
	public int contractSign(ContractDTO contractDTO) throws Exception {
		ContractDTO detail = contractMapper.contractDetail(contractDTO);
		if (detail == null) {
			return -1;
		}

		// ⭐ getUsernameAsLong() 사용
		Long loginId = contractDTO.getUsernameAsLong();
		String senderIdStr = detail.getSenderId();
		Long senderId = (senderIdStr != null) ? Long.parseLong(senderIdStr) : null;

		boolean party = loginId != null
				&& (loginId.equals(senderId) || loginId.equals(detail.getReceiverId()));
		if (!party) {
			return -2;
		}

		if (!"ISSUED".equals(detail.getStatus())) {
			return -3;
		}

		int result = contractMapper.contractSign(contractDTO);

		if (result > 0) {
			Long contract = detail.getContract();
			if (contract != null && (contract == 2 || contract == 3 || contract == 4)) {
				memberService.autoJoin(detail);
			}

			if (contract != null && (contract == 1 || contract == 2)
					&& detail.getStartDate() != null
					&& !detail.getStartDate().isAfter(java.time.LocalDate.now())) {
				contractMapper.contractActive(contractDTO);
			}
		}

		return result;
	}

	public List<ContractDTO> contractRoster(ContractDTO contractDTO) throws Exception {
		String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();

		if (role == null || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
			return null;
		}

		contractSweep();

		if (role.equals("ADMIN")) {
			if (contractDTO.getGymId() == null) {
				return contractMapper.rosterGymList();
			}
			return contractMapper.rosterMemberList(contractDTO);
		}

		if (role.equals("OWNER")) {
			MemberDTO find = new MemberDTO();
			// ⭐ getUsernameAsLong() 사용
			find.setUsername(contractDTO.getUsernameAsLong());
			MemberDTO owner = memberMapper.idCheck(find);
			Long gymId = (owner != null && owner.getGymId() != null) ? owner.getGymId() : -1L;
			contractDTO.setGymId(gymId);
			return contractMapper.rosterMemberList(contractDTO);
		}

		return contractMapper.rosterManagedList(contractDTO);
	}

	public List<MemberDTO> jobSeekingTrainers(String role) throws Exception {
		String upper = role == null ? null : role.toUpperCase();
		if (!"ADMIN".equals(upper)) {
			return null;
		}

		contractSweep();
		return contractMapper.jobSeekingTrainers();
	}

}
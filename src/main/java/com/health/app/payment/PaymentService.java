package com.health.app.payment;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.contract.ContractDTO;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;
import com.health.app.settle.SettleService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentService {

	private final PaymentMapper paymentMapper;
	private final SettleService settleService;

	public int paymentAdd(PaymentDTO paymentDTO) throws Exception {
		return paymentMapper.paymentAdd(paymentDTO);
	}

	public int paymentAddForOwner(Long username, PaymentDTO paymentDTO) throws Exception {
		Long gymId = paymentMapper.getOwnerGymId(username);
		if (gymId == null) {
			throw new IllegalArgumentException("OWNER 소속 사업장을 찾을 수 없습니다.");
		}
		paymentDTO.setGymId(gymId);
		if (paymentMapper.isValidOwnerPaymentTarget(gymId, paymentDTO.getUsername(), paymentDTO.getDataId()) != 1) {
			throw new IllegalArgumentException("해당 사업장의 회원과 계약만 매출로 등록할 수 있습니다.");
		}
		return paymentMapper.paymentAdd(paymentDTO);
	}

	public PagedResponse<PaymentDTO> paymentList(Long username, Pager pager, String sort) throws Exception {
		pager.makeOffset();
		List<PaymentDTO> items = paymentMapper.paymentList(username, pager, sort);
		long totalCount = paymentMapper.paymentListCount(username, pager);
		long totalAmount = paymentMapper.paymentListSum(username, pager);
		pager.makeBlock(totalCount);

		return new PagedResponse<>(items, pager, totalCount, totalAmount);
	}

	public List<PaymentDTO> paymentListAll(Long username, Pager pager) throws Exception {
		return paymentMapper.paymentListAll(username, pager);
	}

	public List<ContractDTO> unpaidContractList(Long username) throws Exception {
		return paymentMapper.unpaidContractList(username);
	}

	@Transactional
	public PaymentDeleteResult paymentDeleteForOwner(Long username, Long payId) throws Exception {
		Long gymId = paymentMapper.getOwnerGymId(username);
		if (gymId == null) {
			return new PaymentDeleteResult(false, false);
		}

		PaymentDTO pay = paymentMapper.getPaymentByIdForGym(payId, gymId);
		if (pay == null) {
			return new PaymentDeleteResult(false, false);
		}

		int result = paymentMapper.paymentDeleteForGym(payId, gymId);
		if (result <= 0) {
			return new PaymentDeleteResult(false, false);
		}

		boolean alreadyPaidWarning = settleService.recalcCommissionAfterPaymentDeleted(gymId, pay.getPayDate());
		return new PaymentDeleteResult(true, alreadyPaidWarning);
	}

}
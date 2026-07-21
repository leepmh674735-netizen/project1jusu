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
	public PaymentDeleteResult paymentDelete(Long payId) throws Exception {
		PaymentDTO pay = paymentMapper.getPaymentById(payId);
		if (pay == null) {
			return new PaymentDeleteResult(false, false);
		}

		int result = paymentMapper.paymentDelete(payId);
		if (result <= 0) {
			return new PaymentDeleteResult(false, false);
		}

		boolean alreadyPaidWarning = settleService.recalcCommissionAfterPaymentDeleted(pay.getGymId(),
				pay.getPayDate());
		return new PaymentDeleteResult(true, alreadyPaidWarning);
	}
}
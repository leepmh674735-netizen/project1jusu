package com.health.app.payment;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

@Mapper
public interface PaymentMapper {

	public Long getOwnerGymId(@Param("username") Long username) throws Exception;

	public int isValidOwnerPaymentTarget(@Param("gymId") Long gymId,
			@Param("payerUsername") Long payerUsername, @Param("dataId") Long dataId) throws Exception;

	public int paymentAdd(PaymentDTO paymentDTO) throws Exception;

	public List<PaymentDTO> paymentList(@Param("username") Long username, @Param("pager") Pager pager,
			@Param("sort") String sort) throws Exception;

	public long paymentListCount(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

	public long paymentListSum(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

	public List<PaymentDTO> paymentListAll(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

	public List<ContractDTO> unpaidContractList(@Param("username") Long username) throws Exception;

	public PaymentDTO getPaymentById(@Param("payId") Long payId) throws Exception;

	public PaymentDTO getPaymentByIdForGym(@Param("payId") Long payId, @Param("gymId") Long gymId) throws Exception;

	public int paymentDelete(@Param("payId") Long payId) throws Exception;

	public int paymentDeleteForGym(@Param("payId") Long payId, @Param("gymId") Long gymId) throws Exception;

}
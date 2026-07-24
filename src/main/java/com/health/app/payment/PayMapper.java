package com.health.app.payment;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;

@Mapper
public interface PayMapper {

	public ContractDTO findPaymentContract(
			@Param("dataId") Long dataId, 
			@Param("username") Long ownerUsername) throws Exception;

	public int insertPay(PayDTO payDTO) throws Exception;

}
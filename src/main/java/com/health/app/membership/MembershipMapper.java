package com.health.app.membership;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.health.app.contract.ContractDTO;

@Mapper
public interface MembershipMapper {
	
	public List<ContractDTO> list(Long username) throws Exception;

}

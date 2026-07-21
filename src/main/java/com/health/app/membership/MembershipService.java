package com.health.app.membership;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.contract.ContractDTO;

@Service
public class MembershipService {

	@Autowired
	private MembershipMapper membershipMapper;

	public List<ContractDTO> list(Long username) throws Exception {
		return membershipMapper.list(username);
	}

}

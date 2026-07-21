package com.health.app.gym;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GymService {
	
	@Autowired
	private GymMapper gymMapper;
	
	public List<GymDTO> selectId()throws Exception{
		return gymMapper.selectId();
	}

}

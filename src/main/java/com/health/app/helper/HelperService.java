package com.health.app.helper;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

@Service
public class HelperService {
	
	private final HelperMapper helperMapper;
	
	public HelperService(HelperMapper helperMapper) {
		this.helperMapper = helperMapper;
	}

	public List<Map<String, Object>> selectTrainers(Long gymId) {
		return helperMapper.selectTrainers(gymId);
	}
	
	public List<Map<String, Object>> selectComplaintManagers(Long gymId, String mode, String period, String statKey) {
		return helperMapper.selectComplaintManagers(gymId, mode, period, statKey);
	}
	
	public List<Map<String, Object>> selectServiceCenters() {
		return helperMapper.selectServiceCenters();
	}
	
	public int insertHelperRequest(String username, String contents) {
		return helperMapper.insertRequest(username, contents);
	}
}
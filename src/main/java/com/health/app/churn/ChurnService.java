package com.health.app.churn;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChurnService {

	private final ChurnMapper churnMapper;

	public ChurnService(ChurnMapper churnMapper) {
		this.churnMapper = churnMapper;
	}

	public int create(ChurnDTO churnDTO) throws Exception {
		return churnMapper.create(churnDTO);
	}

	public ChurnDTO selectByUsername(Long username) throws Exception {
		if (username == null) {
			return null;
		}
		return churnMapper.selectByUsername(username);
	}

	public Object predictByUsername(Long username) throws Exception {
		if (username == null) {
			return null;
		}
		return churnMapper.selectByUsername(username);
	}

	public List<ChurnDTO> selectAll() throws Exception {
		return churnMapper.selectAll();
	}

	@Transactional
	public int upsertChurnFeatures(ChurnDTO dto) throws Exception {
		return churnMapper.upsertChurnFeatures(dto);
	}

	@Transactional
	public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception {
		if (list == null || list.isEmpty()) {
			return 0;
		}
		return churnMapper.upsertChurnFeaturesAll(list);
	}
}
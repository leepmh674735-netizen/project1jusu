package com.health.app.result;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResultService {

	private final ResultMapper resultMapper;

	public ResultDTO selectByDataId(Long dataId) throws Exception {
		return resultMapper.selectByDataId(dataId);
	}

	public List<ResultDTO> selectAll(Long gymId) throws Exception {
		return resultMapper.selectAll(gymId);
	}

	public List<ChurnStatPeriodDTO> selectStatPeriods(Long gymId, String mode) throws Exception {
		return resultMapper.selectStatPeriods(gymId, mode);
	}

	public List<ChurnStatItemDTO> selectStatBreakdown(Long gymId, String mode, String period) throws Exception {
		return resultMapper.selectStatBreakdown(gymId, mode, period);
	}

	public List<ChurnStatMemberDTO> selectStatMembers(Long gymId, String mode, String period, String statType,
			String statKey) throws Exception {
		return resultMapper.selectStatMembers(gymId, mode, period, statType, statKey);
	}

	public List<ChurnRiskMemberDTO> selectRiskMembers(Long gymId, String mode, String period) throws Exception {
		return resultMapper.selectRiskMembers(gymId, mode, period);
	}

	public List<ChurnStatMemberDTO> selectMembersByChurn(Long gymId) throws Exception {
		return resultMapper.selectMembersByChurn(gymId);
	}

	public List<ChurnStatMemberDTO> selectMembersByFactor(Long gymId, String statKey) throws Exception {
		return resultMapper.selectMembersByFactor(gymId, statKey);
	}
}
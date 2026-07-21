package com.health.app.result;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/result")
@RequiredArgsConstructor
public class ResultController {
	
	private final ResultService resultService;
	
	@GetMapping("/{dataId}")
	public ResponseEntity<ResultDTO> selectByDataId(@PathVariable("dataId") Long dataId) throws Exception {
		ResultDTO dto = resultService.selectByDataId(dataId);
		if (dto == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(dto);
	}
	
	@GetMapping("/list")
	public ResponseEntity<List<ResultDTO>> selectAll(@RequestParam(required = false) Long gymId) throws Exception {
		return ResponseEntity.ok(resultService.selectAll(gymId));
	}
	
	@GetMapping("/stats/periods")
	public ResponseEntity<List<ChurnStatPeriodDTO>> statPeriods(
			@RequestParam Long gymId,
			@RequestParam(defaultValue = "daily") String mode) throws Exception {
		return ResponseEntity.ok(resultService.selectStatPeriods(gymId, mode));
	}
	
	@GetMapping("/stats/breakdown")
	public ResponseEntity<List<ChurnStatItemDTO>> statBreakdown( 
			@RequestParam Long gymId,
			@RequestParam(defaultValue = "daily") String mode,
			@RequestParam String period) throws Exception {
		return ResponseEntity.ok(resultService.selectStatBreakdown(gymId, mode, period));
	}
	
	@GetMapping("/stats/members")
	public ResponseEntity<List<ChurnStatMemberDTO>> statMembers(
			@RequestParam Long gymId,
			@RequestParam(defaultValue = "daily") String mode,
			@RequestParam String period,
			@RequestParam String statType,
			@RequestParam String statKey) throws Exception {
		return ResponseEntity.ok(resultService.selectStatMembers(gymId, mode, period, statType, statKey));
	}
	
	@GetMapping("/stats/riskMembers")
	public ResponseEntity<List<ChurnRiskMemberDTO>> riskMembers(
			@RequestParam Long gymId,
			@RequestParam(defaultValue = "daily") String mode,
			@RequestParam String period) throws Exception {
		return ResponseEntity.ok(resultService.selectRiskMembers(gymId, mode, period));
	}
	
	@GetMapping("/members/byChurn")
	public ResponseEntity<List<ChurnStatMemberDTO>> membersByChurn(@RequestParam Long gymId) throws Exception {
		return ResponseEntity.ok(resultService.selectMembersByChurn(gymId));
	}
	
	@GetMapping("/members/byFactor")
	public ResponseEntity<List<ChurnStatMemberDTO>> membersByFactor(
			@RequestParam Long gymId,
			@RequestParam String statKey) throws Exception {
		return ResponseEntity.ok(resultService.selectMembersByFactor(gymId, statKey));
	}

}
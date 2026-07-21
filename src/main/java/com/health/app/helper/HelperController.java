package com.health.app.helper;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/result")
public class HelperController {

	private final HelperService helperService;

	public HelperController(HelperService helperService) {
		this.helperService = helperService;
	}

	@GetMapping("/stats/helper/trainers")
	public ResponseEntity<List<Map<String, Object>>> helperTrainers(@RequestParam("gymId") Long gymId) {
		return ResponseEntity.ok(helperService.selectTrainers(gymId));
	}

	@GetMapping("/stats/helper/complaintVisitVistiTimes")
	public ResponseEntity<List<Map<String, Object>>> helperComplaintVisitTimes(
			@RequestParam("gymId") Long gymId,
			@RequestParam(value = "mode", defaultValue = "daily") String mode, 
			@RequestParam("period") String period,
			@RequestParam("statKey") String statKey) {
		return ResponseEntity.ok(helperService.selectComplaintManagers(gymId, mode, period, statKey));
	}

	@GetMapping("/stats/helper/complaintManagers")
	public ResponseEntity<List<Map<String, Object>>> helperComplaintManagers(
			@RequestParam("gymId") Long gymId,
			@RequestParam(value = "mode", defaultValue = "daily") String mode, 
			@RequestParam("period") String period,
			@RequestParam("statKey") String statKey) {
		return ResponseEntity.ok(helperService.selectComplaintManagers(gymId, mode, period, statKey));
	}

	@GetMapping("/stats/helper/serviceCenters")
	public ResponseEntity<List<Map<String, Object>>> helperServiceCenters() {
		return ResponseEntity.ok(helperService.selectServiceCenters());
	}

	@PostMapping("/helper/request")
	public ResponseEntity<?> helperRequest(@RequestBody Map<String, Object> body) {
		if (body.get("username") == null) {
			return ResponseEntity.badRequest().body("username 필요");
		}
		
		String username = String.valueOf(body.get("username"));
		String contents = body.get("contents") == null ? null : String.valueOf(body.get("contents"));
		
		int n = helperService.insertHelperRequest(username, contents);
		return n > 0 ? ResponseEntity.ok("ok") : ResponseEntity.badRequest().body("등록실패");
	}
}
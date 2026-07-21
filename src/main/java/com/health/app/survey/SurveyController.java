package com.health.app.survey;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/survey")
public class SurveyController {

	private final SurveyService surveyService;

	public SurveyController(SurveyService surveyService) {
		this.surveyService = surveyService;
	}

	@PostMapping("/create")
	public ResponseEntity<String> create(@RequestBody SurveyDTO surveyDTO) {
		int result = surveyService.create(surveyDTO);
		if (result > 0) {
			return ResponseEntity.ok("Success");
		}
		return ResponseEntity.badRequest().body("Fail");
	}

	@GetMapping("/{username}")
	public ResponseEntity<SurveyDTO> selectByUsername(@PathVariable("username") String username) {
		SurveyDTO dto = surveyService.selectByUsername(username);
		if (dto == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(dto);
	}

	@GetMapping("/list")
	public ResponseEntity<List<SurveyDTO>> selectAll() {
		return ResponseEntity.ok(surveyService.selectAll());
	}
}
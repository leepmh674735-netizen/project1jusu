package com.health.app.churn;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/churn")
public class ChurnController {

	private final ChurnService churnService;

	public ChurnController(ChurnService churnService) {
		this.churnService = churnService;
	}

	@PostMapping("/create")
	public ResponseEntity<String> create(@RequestBody ChurnDTO churnDTO) throws Exception {
		int result = churnService.create(churnDTO);
		if (result > 0) {
			return ResponseEntity.ok("Success");
		}
		return ResponseEntity.badRequest().body("Fail");
	}

	@GetMapping("/{username}")
	public ResponseEntity<ChurnDTO> selectByUsername(@PathVariable("username") Long username) throws Exception {
		ChurnDTO dto = churnService.selectByUsername(username);
		if (dto == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(dto);
	}

	@GetMapping("/list")
	public ResponseEntity<List<ChurnDTO>> selectAll() throws Exception {
		return ResponseEntity.ok(churnService.selectAll());
	}
}
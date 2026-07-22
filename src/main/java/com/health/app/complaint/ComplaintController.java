package com.health.app.complaint;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/complaint")
public class ComplaintController {

	@Autowired
	private ComplaintService complaintService;

	@Autowired
	private JwtUtill jwtUtill;

	@PostMapping("/create")
	public ResponseEntity<String> create(@RequestBody ComplaintDTO complaintDTO) throws Exception {
		int result = complaintService.create(complaintDTO);
		if (result > 0) {
			return ResponseEntity.ok("건의 사항 접수 완료");
		}
		return ResponseEntity.badRequest().body("접수 실패");
	}

	@GetMapping("/memberlist")
	public ResponseEntity<?> memberList(@RequestHeader(value = "Authorization", required = false) String authorization)
			throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않는 토큰입니다.");
		}

		Long loginUsername = Long.parseLong(claims.getSubject());
		List<ComplaintDTO> list = complaintService.memberList(loginUsername);
		return ResponseEntity.ok(list);
	}

	// 오타 수정 (owerList -> ownerList) 및 지점별(gymId) 목록 서비스 호출
	@GetMapping("/ownerlist")
	public ResponseEntity<?> ownerList(@RequestParam("gymId") Long gymId) throws Exception {
		try {
			List<ComplaintDTO> list = complaintService.ownerList(gymId);
			return ResponseEntity.ok(list);
		} catch (Exception e) {
			return ResponseEntity.badRequest().body("목록을 불러오는 중 오류가 발생했습니다: " + e.getMessage());
		}
	}

	@PostMapping("/status")
	public ResponseEntity<String> update(@RequestBody ComplaintDTO complaintDTO) throws Exception {
		int result = complaintService.update(complaintDTO);
		if (result > 0) {
			return ResponseEntity.ok("success");
		}
		return ResponseEntity.badRequest().body("fail");
	}

}
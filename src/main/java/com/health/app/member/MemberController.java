package com.health.app.member;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/member")
@RequiredArgsConstructor
public class MemberController {

	private final MemberService memberService;
	private final JwtUtill jwtUtill;

	@GetMapping("/list/gym")
	public ResponseEntity<?> getGymMembers(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(value = "gymId") Long gymId) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		try {
			jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		List<MemberDTO> members = memberService.findMembersByGymId(gymId);
		return ResponseEntity.ok(members);
	}

	@PutMapping("/update")
	public ResponseEntity<String> update(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody MemberDTO memberDTO) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long loginUsername = Long.parseLong(claims.getSubject());
		memberDTO.setUsername(loginUsername);

		int result = memberService.update(memberDTO);

		if (result == -1) {
			return ResponseEntity.badRequest().body("비밀번호를 바르게 입력해주세요");
		} else if (result == -2) {
			return ResponseEntity.badRequest().body("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
		} else if (result > 0) {
			return ResponseEntity.ok("Success");
		} else {
			return ResponseEntity.badRequest().body("Fail");
		}
	}

	@PostMapping("/idcheck")
	public ResponseEntity<String> idcheck(@RequestBody MemberDTO memberDTO) throws Exception {
		MemberDTO check = memberService.idcheck(memberDTO);
		if (check != null) {
			return ResponseEntity.ok("Duplicate");
		} else {
			return ResponseEntity.ok("Available");
		}
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody MemberDTO memberDTO) throws Exception {
		MemberDTO loginMember = memberService.login(memberDTO);
		if (loginMember != null) {
			Map<String, String> tokenMap = memberService.generatedLoginTokens(loginMember);
			Map<String, Object> responseData = new HashMap<>();
			responseData.put("member", loginMember);
			responseData.put("token", tokenMap.get("accessToken"));
			responseData.put("refreshToken", tokenMap.get("refreshToken"));

			return ResponseEntity.ok(responseData);
		} else {
			return ResponseEntity.badRequest().body("아이디 또는 비밀번호가 올바르지 않습니다.");
		}
	}

	@PostMapping("/refresh")
	public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
		try {
			String refreshToken = request.get("refreshToken");
			if (refreshToken == null || refreshToken.isEmpty()) {
				return ResponseEntity.badRequest().body("리프레쉬 토큰 누락되었습니다.");
			}

			String newAccessToken = memberService.refreshAccessToken(refreshToken);

			Map<String, String> response = new HashMap<>();
			response.put("accessToken", newAccessToken);
			return ResponseEntity.ok(response);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("서버 갱신 처리 실패");
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
		try {
			if (authorization == null || !authorization.startsWith("Bearer ")) {
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
			}
			Claims claims = jwtUtill.extractAllClaims(authorization.substring(7));
			Long username = Long.parseLong(claims.getSubject());

			memberService.deleteToken(username);
			return ResponseEntity.ok("정상적 로그아웃 처리가 완료되었습니다.");
		} catch (Exception e) {
			return ResponseEntity.badRequest().body("로그아웃 처리 실패");
		}
	}
}
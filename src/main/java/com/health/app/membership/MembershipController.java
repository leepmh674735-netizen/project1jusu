package com.health.app.membership;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;
import com.health.app.contract.ContractDTO;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/membership")
@RequiredArgsConstructor
public class MembershipController {

	private final MembershipService membershipService;
	private final JwtUtill jwtUtill;

	@GetMapping("/list")
	public ResponseEntity<?> getMyMembership(
			@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않는 토큰입니다.");
		}

		Long loginUsername = Long.parseLong(claims.getSubject());
		List<ContractDTO> list = membershipService.list(loginUsername);
		return ResponseEntity.ok(list);
	}

}
package com.health.app.payment;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/fitb/payment")
@RequiredArgsConstructor
public class PayController {

	private final PayService payService;
	private final JwtUtill jwtUtill;

	@PostMapping("/checkout")
	public ResponseEntity<?> checkout(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody PayDTO req) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerUsername = Long.parseLong(claims.getSubject());

		try {
			PayDTO result = payService.checkout(req.getDataId(), ownerUsername, req.getCouponId(),
					req.getInstallment());
			return ResponseEntity.ok(result);
		} catch (IllegalStateException e) {
			return ResponseEntity.badRequest().body(e.getMessage());
		}
	}

}
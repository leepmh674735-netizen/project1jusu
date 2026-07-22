package com.health.app.coupon;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
@RequestMapping("/coupon")
public class CouponController {

	@Autowired
	private CouponService couponService;

	@Autowired
	private JwtUtill jwtUtill;

	private Long validateAndGetUsername(String authorization) {
		if (authorization == null || !authorization.startsWith("Bearer ")) {
			throw new IllegalArgumentException("로그인이 필요합니다.");
		}
		try {
			Claims claims = jwtUtill.extractAllClaims(authorization.substring(7));
			return Long.parseLong(claims.getSubject());
		} catch (Exception e) {
			throw new IllegalArgumentException("유효하지 않는 토큰입니다.");
		}
	}

	@PostMapping("tolist")
	public ResponseEntity<?> toList(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody CouponTypeDTO typeDTO) throws Exception {
		try {
			validateAndGetUsername(authorization);
			int result = couponService.createCoupon(typeDTO);
			if (result > 0) {
				return ResponseEntity.ok("쿠폰 종류가 정상 등록되었습니다.");
			}
			return ResponseEntity.badRequest().body("쿠폰 종류 등록 실패");
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

	@GetMapping("type/list")
	public ResponseEntity<?> couponTypeList(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam("gymId") Long gymId) throws Exception {
		try {
			validateAndGetUsername(authorization);
			List<CouponTypeDTO> list = couponService.couponTypeList(gymId);
			return ResponseEntity.ok(list);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

	@PostMapping("send")
	public ResponseEntity<?> sendCoupon(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody CouponDTO couponDTO) throws Exception {
		try {
			Long ownerId = validateAndGetUsername(authorization);
			couponDTO.setFromId(ownerId);

			int result = couponService.sendCoupon(couponDTO);
			if (result > 0) {
				return ResponseEntity.ok("쿠폰이 정상적으로 발송되었습니다.");
			}
			return ResponseEntity.badRequest().body("쿠폰 발송 실패");
		} catch (IllegalArgumentException e) {
			if (e.getMessage() != null && e.getMessage().contains("이미 사용하지 않는")) {
				return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
			}
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

	@PostMapping("sendChurnTargets")
	public ResponseEntity<?> sendChurnTargets(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody Map<String, Object> body) throws Exception {

		try {
			Long ownerId = validateAndGetUsername(authorization);
			if (body.get("couponNum") == null || body.get("date") == null) {
				return ResponseEntity.badRequest().body("couponNum, date는 필수입니다.");
			}
			Long couponNum = Long.valueOf(String.valueOf(body.get("couponNum")));
			String couponName = body.get("couponName") == null ? null : String.valueOf(body.get("couponName"));
			java.time.LocalDate date = java.time.LocalDate.parse(String.valueOf(body.get("date")));

			List<Long> usernames = new ArrayList<>();
			Object raw = body.get("usernames");
			if (raw instanceof List<?> list) {
				for (Object o : list) {
					usernames.add(Long.valueOf(String.valueOf(o)));
				}
			}
			if (usernames.isEmpty()) {
				return ResponseEntity.badRequest().body("발송 대상 회원이 없습니다.");
			}

			Map<String, Integer> result = couponService.sendToChurnMembers(ownerId, couponNum, couponName,
					date, usernames);
			return ResponseEntity.ok(result);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

	@GetMapping("status")
	public ResponseEntity<?> couponStatus(
			@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
		try {
			Long fromId = validateAndGetUsername(authorization);

			List<CouponDTO> list = couponService.couponStatus(fromId);
			return ResponseEntity.ok(list);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

	@GetMapping("trial/list")
	public ResponseEntity<?> trialList(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam("gymId") Long gymId) throws Exception {
		try {
			validateAndGetUsername(authorization);
			List<CouponDTO> list = couponService.trialList(gymId);
			return ResponseEntity.ok(list);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
		}
	}

}
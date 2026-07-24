package com.health.app.payment;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/fitb/payment")
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentService paymentService;
	private final JwtUtill jwtUtill;

	private boolean isOwner(Claims claims) {
		Object role = claims.get("role");
		return role != null && "OWNER".equalsIgnoreCase(role.toString());
	}

	private Long subject(Claims claims) {
		try {
			return Long.valueOf(claims.getSubject());
		} catch (RuntimeException e) {
			return null;
		}
	}

	@PostMapping("/payadd")
	public ResponseEntity<?> paymentAdd(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody PaymentDTO paymentDTO) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerPhone = subject(claims);
		if (ownerPhone == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");

		int result;
		try {
			result = paymentService.paymentAddForOwner(ownerPhone, paymentDTO);
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(e.getMessage());
		}
		if (result > 0) {
			return ResponseEntity.ok("Success");
		} else {
			return ResponseEntity.badRequest().body("Fail");
		}
	}

	@GetMapping("/paylist")
	public ResponseEntity<?> paymentList(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(required = false) Long page,
			@RequestParam(required = false) Long pageSize,
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String month,
			@RequestParam(required = false) String sort) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerPhone = subject(claims);
		if (ownerPhone == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");

		Pager pager = new Pager();
		pager.setCurrentPage(page);
		pager.setPageSize(pageSize);
		pager.setSearchKeyword(keyword);
		pager.setMonth(month);

		return ResponseEntity.ok(paymentService.paymentList(ownerPhone, pager, sort));
	}

	@GetMapping("/paylist/export")
	public ResponseEntity<?> paymentListAll(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String month) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerPhone = subject(claims);
		if (ownerPhone == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");

		Pager pager = new Pager();
		pager.setSearchKeyword(keyword);
		pager.setMonth(month);

		return ResponseEntity.ok(paymentService.paymentListAll(ownerPhone, pager));
	}

	@DeleteMapping("/pay/{payId}")
	public ResponseEntity<?> paymentDelete(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable("payId") Long payId) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerPhone = subject(claims);
		if (ownerPhone == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");

		PaymentDeleteResult result = paymentService.paymentDeleteForOwner(ownerPhone, payId);
		if (!result.isDeleted()) {
			return ResponseEntity.notFound().build();
		}

		return ResponseEntity.ok(result);
	}

	@GetMapping("/unpaid-contracts")
	public ResponseEntity<?> unpaidContractList(
			@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
		}

		Claims claims;
		try {
			claims = jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		}

		Long ownerPhone = subject(claims);
		if (ownerPhone == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
		if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");

		List<ContractDTO> list = paymentService.unpaidContractList(ownerPhone);
		return ResponseEntity.ok(list);
	}

}
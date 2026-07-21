package com.health.app.settle;

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
import com.health.app.pager.Pager;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/fitb/settle")
@RequiredArgsConstructor
public class SettleController {
	
	private final SettleService settleService;
	private final JwtUtill jwtUtill;
	
	/**
	 * JWT 검증 및 Claims 추출 공통 Helper 메서드
	 */
	private Claims extractClaims(String authorization) {
		if (authorization == null || !authorization.startsWith("Bearer ")) {
			return null;
		}
		try {
			return jwtUtill.extractAllClaims(authorization.substring(7));
		} catch (Exception e) {
			return null;
		}
	}
	
	@GetMapping("/commission")
	public ResponseEntity<?> commissionList(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(required = false) Long page,
			@RequestParam(required = false) Long pageSize,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String month,
			@RequestParam(required = false) String sort) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		Pager pager = new Pager();
		pager.setCurrentPage(page);
		pager.setPageSize(pageSize);
		pager.setSearchKeyword(status);
		pager.setMonth(month);
		
		return ResponseEntity.ok(settleService.commissionList(pager, sort));
	}
	
	@GetMapping("/commission/export")
	public ResponseEntity<?> commissionListAll(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String month) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		Pager pager = new Pager();
		pager.setSearchKeyword(status);
		pager.setMonth(month);
		
		return ResponseEntity.ok(settleService.commissionListAll(pager));
	}
	
	@GetMapping("/commission/status")
	public ResponseEntity<?> commissionStats(
			@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		return ResponseEntity.ok(settleService.commissionStats());
	}
	
	@PostMapping("/commission/status")
	public ResponseEntity<?> toggleCommissionStatus(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody CommissionDTO req) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		if (req == null || req.getSettlementId() == null) {
			return ResponseEntity.badRequest().body("settlementId가 누락되었습니다.");
		}
		
		int result = settleService.toggleCommissionStatus(req.getSettlementId());
		if (result > 0) {
			return ResponseEntity.ok("Success");
		} else {
			return ResponseEntity.badRequest().body("상태 변경에 실패했습니다.");
		}
	}
	
	@DeleteMapping("/expense/{expenseId}")
	public ResponseEntity<?> expenseDelete( 
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable("expenseId") Long expenseId) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		int result = settleService.expenseDelete(expenseId);
		if (result > 0) {
			return ResponseEntity.ok("삭제가 완료되었습니다.");
		} else if (result == -2) {
			return ResponseEntity.badRequest().body("이미 정산에 반영된 지출은 삭제할 수 없습니다.");
		} else {
			return ResponseEntity.badRequest().body("지출 내역 삭제에 실패했습니다.");
		}
	}
	
	@PostMapping("/commission/generate")
	public ResponseEntity<?> generateCommissions( 
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody CommissionDTO req) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		if (req == null || req.getSettleMonth() == null) {
			return ResponseEntity.badRequest().body("settleMonth is required");
		}
		
		// String / LocalDate 모두 호환되도록 .toString() 처리
		String settleMonthStr = req.getSettleMonth().toString();
		int count = settleService.generateMonthlyCommission(settleMonthStr);
		
		return ResponseEntity.ok("Successfully generated " + count + " commission records.");
	}
	
	@GetMapping("/unpaid-expenses")
	public ResponseEntity<?> unpaidExpenseContractList(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(required = false) Long page,
			@RequestParam(required = false) Long pageSize) throws Exception {
		
		Claims claims = extractClaims(authorization);
		if (claims == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요하거나 유효하지 않은 토큰입니다.");
		}
		
		Long ownerPhone;
		try {
			ownerPhone = Long.parseLong(claims.getSubject());
		} catch (NumberFormatException e) {
			return ResponseEntity.badRequest().body("유효하지 않은 사용자 정보 형식입니다.");
		}
		
		Pager pager = new Pager();
		pager.setCurrentPage(page);
		pager.setPageSize(pageSize);
		
		return ResponseEntity.ok(settleService.unpaidExpenseContractList(ownerPhone, pager));
	}
}
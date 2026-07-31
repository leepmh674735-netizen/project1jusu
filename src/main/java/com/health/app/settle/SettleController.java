package com.health.app.settle;

import org.springframework.beans.factory.annotation.Autowired;
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

@RestController
@RequestMapping("/fitb/settle")
public class SettleController {

    @Autowired
    private SettleService settleService;

    @Autowired
    private JwtUtill jwtUtill;

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

    private boolean hasRole(Claims claims, String expectedRole) {
        String role = claims == null ? null : claims.get("role", String.class);
        return role != null && role.equalsIgnoreCase(expectedRole);
    }

    private String upperRole(Claims claims) {
        String role = claims == null ? null : claims.get("role", String.class);
        return role == null ? null : role.toUpperCase();
    }

    private boolean hasAnyRole(Claims claims, String... expectedRoles) {
        String role = upperRole(claims);
        if (role == null) {
            return false;
        }
        for (String expected : expectedRoles) {
            if (role.equals(expected.toUpperCase())) {
                return true;
            }
        }
        return false;
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        Pager pager = new Pager();
        pager.setSearchKeyword(status);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.commissionListAll(pager));
    }

    @GetMapping("/commission/stats")
    public ResponseEntity<?> commissionStats(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        return ResponseEntity.ok(settleService.commissionStats());
    }

    @GetMapping("/owner-summary")
    public ResponseEntity<?> ownerSettleSummary(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String month) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        String role = claims.get("role", String.class);
        if (role == null || !role.equalsIgnoreCase("OWNER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        Long username = Long.parseLong(claims.getSubject());
        return ResponseEntity.ok(settleService.ownerSettleSummary(username, month));
    }

    @GetMapping("/owner-commissions/unpaid")
    public ResponseEntity<?> ownerUnpaidCommissionList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "OWNER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        return ResponseEntity.ok(settleService.ownerUnpaidCommissionList(Long.parseLong(claims.getSubject())));
    }

    @GetMapping("/expense")
    public ResponseEntity<?> expenseList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String sort) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        if (!hasAnyRole(claims, "OWNER", "TRAINER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        Long username = Long.parseLong(claims.getSubject());
        String role = upperRole(claims);

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.expenseList(username, role, pager, sort));
    }

    @GetMapping("/expense/export")
    public ResponseEntity<?> expenseListAll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String month) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        if (!hasAnyRole(claims, "OWNER", "TRAINER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        Long username = Long.parseLong(claims.getSubject());
        String role = upperRole(claims);

        Pager pager = new Pager();
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.expenseListAll(username, role, pager));
    }

    @PostMapping("/expense")
    public ResponseEntity<?> expenseAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ExpenseDTO expenseDTO) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        if (!hasRole(claims, "OWNER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        try {
            int result = settleService.expenseAddForOwner(Long.parseLong(claims.getSubject()), expenseDTO);
            return result > 0 ? ResponseEntity.ok("Success") : ResponseEntity.badRequest().body("Fail");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/expense/{expenseId}")
    public ResponseEntity<?> expenseDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("expenseId") Long expenseId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "OWNER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        int result = settleService.expenseDelete(Long.parseLong(claims.getSubject()), expenseId);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    @PostMapping("/commission/generate")
    public ResponseEntity<?> generateCommissions(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody CommissionDTO req) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        if (!hasRole(claims, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        if (req.getSettleMonth() == null) {
            return ResponseEntity.badRequest().body("settleMonth is required");
        }

        try {
            int count = settleService.generateMonthlyCommissions(req.getSettleMonth());
            return ResponseEntity.ok("Successfully generated " + count + " commission records.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/unpaid-expenses")
    public ResponseEntity<?> unpaidExpenseContractList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        if (!hasRole(claims, "OWNER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        Long ownerPhone = Long.parseLong(claims.getSubject());

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);

        return ResponseEntity.ok(settleService.unpaidExpenseContractList(ownerPhone, pager));
    }
}
package com.health.app.checkInout;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;

import io.jsonwebtoken.Claims;

@RestController
public class AttendanceController {

    @Autowired
    private CheckInoutService checkInoutService;

    @Autowired
    private JwtUtill jwtUtill;

    @PostMapping("/fitc/attendance/gym")
    public ResponseEntity<?> gymCheckIn(@RequestBody MemberDTO credential) throws Exception {
        try {
            return ResponseEntity.ok(checkInoutService.gymCheckIn(credential));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/fitc/attendance/pt")
    public ResponseEntity<?> ptCheckIn(@RequestBody MemberDTO credential) throws Exception {
        try {
            return ResponseEntity.ok(checkInoutService.ptCheckIn(credential));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/fitb/attendance/pending")
    public ResponseEntity<?> pendingList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.pendingList(trainerUsername);
        return ResponseEntity.ok(li);
    }

    @GetMapping("/fitb/attendance/history")
    public ResponseEntity<?> historyList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.historyList(trainerUsername);
        return ResponseEntity.ok(li);
    }

    @PostMapping("/fitb/attendance/confirm/{inoutId}")
    public ResponseEntity<?> confirmPt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("inoutId") Long inoutId) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        try {
            int remainingCount = checkInoutService.confirmPt(inoutId, trainerUsername);
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("remainingCount", remainingCount);
            return ResponseEntity.ok(responseData);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/fitb/attendance/members")
    public ResponseEntity<?> myMembers(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.myMembers(Long.parseLong(claims.getSubject())));
    }

    @GetMapping("/fitb/attendance/members/status")
    public ResponseEntity<?> memberStatusList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.memberStatusList(Long.parseLong(claims.getSubject())));
    }

    @GetMapping("/fitb/attendance/schedule")
    public ResponseEntity<?> trainerScheduleList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.trainerScheduleList(Long.parseLong(claims.getSubject())));
    }

    @PostMapping("/fitb/attendance/schedule")
    public ResponseEntity<?> scheduleAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PtScheduleDTO schedule) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        try {
            return ResponseEntity.ok(checkInoutService.scheduleAdd(Long.parseLong(claims.getSubject()), schedule));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/fitb/attendance/schedule/{scheduleId}")
    public ResponseEntity<?> scheduleDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("scheduleId") Long scheduleId) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        try {
            checkInoutService.scheduleDelete(scheduleId, Long.parseLong(claims.getSubject()));
            return ResponseEntity.ok("일정이 삭제되었습니다.");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/fitc/attendance/schedule")
    public ResponseEntity<?> memberScheduleList(
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
        return ResponseEntity.ok(checkInoutService.memberScheduleList(Long.parseLong(claims.getSubject())));
    }

    @GetMapping("/fitb/attendance/owner/overview")
    public ResponseEntity<?> ownerOverview(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "gymId", required = false) Long gymIdParam) throws Exception {

        Claims claims = extractOwnerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("사장님 로그인이 필요합니다.");
        }

        try {
            String role = claims.get("role", String.class);
            Long gymId = (gymIdParam != null && role.equalsIgnoreCase("ADMIN"))
                    ? gymIdParam
                    : checkInoutService.resolveGymId(Long.parseLong(claims.getSubject()));

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("trainers", checkInoutService.ownerTrainerPerf(gymId));
            responseData.put("rebooks", checkInoutService.ownerRebookList(gymId));
            responseData.put("schedules", checkInoutService.ownerScheduleList(gymId));
            responseData.put("sessions", checkInoutService.ownerHistoryList(gymId));
            return ResponseEntity.ok(responseData);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/fitb/attendance/admin/gyms")
    public ResponseEntity<?> adminGymOverview(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractOwnerClaims(authorization);
        if (claims == null || !"ADMIN".equalsIgnoreCase(claims.get("role", String.class))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("총괄 관리자 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.adminGymOverview());
    }

    private Claims extractOwnerClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
        String role = claims.get("role", String.class);
        if (role == null || !(role.equalsIgnoreCase("OWNER") || role.equalsIgnoreCase("ADMIN"))) {
            return null;
        }
        return claims;
    }

    private Claims extractTrainerClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
        String role = claims.get("role", String.class);
        if (role == null || !role.equalsIgnoreCase("TRAINER")) {
            return null;
        }
        return claims;
    }
}
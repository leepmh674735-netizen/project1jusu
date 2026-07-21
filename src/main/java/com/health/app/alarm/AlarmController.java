package com.health.app.alarm;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/alarm")
public class AlarmController {

    @Autowired
    private AlarmService alarmService;

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

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestParam("username") String username) throws Exception {
        return alarmService.subscribe(username);
    }

    @GetMapping("/list")
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            Long receiver = Long.parseLong(claims.getSubject());
            List<AlarmDTO> list = alarmService.alarmList(receiver);
            return ResponseEntity.ok(list);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("올바르지 않은 사용자 ID 형식입니다.");
        }
    }

    @PostMapping("/read")
    public ResponseEntity<?> read(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("alarmId") Long alarmId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        int result = alarmService.alarmRead(alarmId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/read/all")
    public ResponseEntity<?> readAll(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            Long receiver = Long.parseLong(claims.getSubject());
            int result = alarmService.readAllAlarms(receiver);
            return ResponseEntity.ok(result);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("올바르지 않은 사용자 ID 형식입니다.");
        }
    }
}
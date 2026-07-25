package com.health.app.checkInout;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/checkin")
public class CheckInoutController {

    @Autowired
    private CheckInoutService checkInoutService;

    @Autowired
    private JwtUtill jwtUtill;

    @GetMapping("/list")
    public ResponseEntity<?> list(
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

        Long loginUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.list(loginUsername);
        return ResponseEntity.ok(li);
    }
}
package com.health.app.ai;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;

import io.jsonwebtoken.Claims;
import jakarta.annotation.PreDestroy;

@RestController
@RequestMapping("/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @Autowired
    private AiBriefingService aiBriefingService;

    @Autowired
    private JwtUtill jwtUtill;

    @Autowired
    private MemberMapper memberMapper;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PreDestroy
    public void shutdown() {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdown();
        }
    }

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

    private boolean allowedRole(String role) {
        return "ADMIN".equals(role) || "OWNER".equals(role) || "TRAINER".equals(role);
    }

    private AuthContext buildContext(Claims claims) throws Exception {
        if (claims == null || claims.getSubject() == null) {
            throw new IllegalArgumentException("유효하지 않은 토큰 정보입니다.");
        }

        Long username;
        try {
            username = Long.parseLong(claims.getSubject().trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("사용자 ID 형식이 올바르지 않습니다.");
        }

        String role = claims.get("role", String.class);
        role = (role == null) ? null : role.toUpperCase();

        MemberDTO find = new MemberDTO();
        find.setUsername(username);
        
        MemberDTO member = memberMapper.idCheck(find);
        Long gymId = (member != null && member.getGymId() != null) ? member.getGymId() : -1L;

        return new AuthContext(username, role, gymId);
    }

    @PostMapping("/chat")
    public Object chat(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody AiChatRequest request) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx;
        try {
            ctx = buildContext(claims);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }

        if (!allowedRole(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("AI 비서를 이용할 수 없는 권한입니다.");
        }

        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body("메시지를 입력해 주세요.");
        }

        SseEmitter emitter = new SseEmitter(5L * 60 * 1000);
        executor.execute(() -> aiService.chat(ctx, request, emitter));
        return emitter;
    }

    @GetMapping("/briefing")
    public ResponseEntity<?> briefing(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx;
        try {
            ctx = buildContext(claims);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }

        if (!allowedRole(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        if (!"OWNER".equals(ctx.getRole())) {
            return ResponseEntity.ok(java.util.Map.of("items", List.of()));
        }

        return ResponseEntity.ok(aiBriefingService.briefing(ctx, false));
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> conversationList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx;
        try {
            ctx = buildContext(claims);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }

        if (!allowedRole(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        return ResponseEntity.ok(aiService.conversationList(ctx));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> messageList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long conversationId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        AuthContext ctx;
        try {
            ctx = buildContext(claims);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }

        if (!allowedRole(ctx.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }

        List<AiMessageDTO> messages = aiService.messageList(ctx, conversationId);
        if (messages == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("대화가 없거나 열람 권한이 없습니다.");
        }
        return ResponseEntity.ok(messages);
    }
}
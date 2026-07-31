package com.health.app.checkInout;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class AttendanceRateLimiter {

    private static final int USER_MAX_FAILURES = 5;
    private static final long USER_LOCK_MILLIS = 60_000L;

    private static final int IP_MAX_FAILURES = 20;
    private static final long IP_LOCK_MILLIS = 300_000L;

    private static final long FAILURE_WINDOW_MILLIS = 600_000L;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    private static class Attempt {
        int failures;
        long lastFailureAt;
        long lockedUntil;
    }

    public void assertNotLocked(Long username, String clientIp) {
        checkKey(userKey(username));
        checkKey(ipKey(clientIp));
    }

    public void recordFailure(Long username, String clientIp) {
        registerFailure(userKey(username), USER_MAX_FAILURES, USER_LOCK_MILLIS);
        registerFailure(ipKey(clientIp), IP_MAX_FAILURES, IP_LOCK_MILLIS);
    }

    public void recordSuccess(Long username, String clientIp) {
        String uKey = userKey(username);
        String iKey = ipKey(clientIp);
        if (uKey != null) attempts.remove(uKey);
        if (iKey != null) attempts.remove(iKey);
    }

    private void checkKey(String key) {
        if (key == null) {
            return;
        }
        Attempt attempt = attempts.get(key);
        if (attempt == null) {
            return;
        }
        long now = System.currentTimeMillis();
        synchronized (attempt) {
            if (attempt.lockedUntil > now) {
                long remainSeconds = (attempt.lockedUntil - now + 999) / 1000;
                throw new AttendanceLockedException("인증 시도가 너무 많습니다. " + remainSeconds + "초 후 다시 시도해 주세요.");
            } else if (now - attempt.lastFailureAt > FAILURE_WINDOW_MILLIS) {
                attempts.remove(key);
            }
        }
    }

    private void registerFailure(String key, int maxFailures, long lockMillis) {
        if (key == null) {
            return;
        }
        long now = System.currentTimeMillis();
        Attempt attempt = attempts.computeIfAbsent(key, k -> new Attempt());
        synchronized (attempt) {
            if (now - attempt.lastFailureAt > FAILURE_WINDOW_MILLIS) {
                attempt.failures = 0;
            }
            attempt.failures++;
            attempt.lastFailureAt = now;
            if (attempt.failures >= maxFailures) {
                attempt.lockedUntil = now + lockMillis;
                attempt.failures = 0;
            }
        }
    }

    private String userKey(Long username) {
        return username == null ? null : "user:" + username;
    }

    private String ipKey(String clientIp) {
        return (clientIp == null || clientIp.isBlank()) ? null : "ip:" + clientIp;
    }
}
package com.health.app.config;

import java.security.Key;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtill {

	private final Key key;
	private final long time;
	private final long refreshTime;

	public JwtUtill(
			@Value("${jwt.secretKey}") String secretKey,
			@Value("${jwt.accessValidTime}") long accessValidTime,
			@Value("${jwt.refreshValidTime}") long refreshValidTime) {
		this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
		this.time = accessValidTime;
		this.refreshTime = refreshValidTime;
	}

	public String generateToken(String username, String role) throws Exception {
		Map<String, Object> claims = new HashMap<>();
		claims.put("role", role);
		return Jwts.builder()
				.setClaims(claims)
				.setSubject(username)
				.setIssuedAt(new Date(System.currentTimeMillis()))
				.setExpiration(new Date(System.currentTimeMillis() + time))
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}

	public String generateToken(String username) throws Exception {
		return generateRefreshToken(username);
	}

	public String generateRefreshToken(String username) throws Exception {
		return Jwts.builder()
				.setSubject(username)
				.setIssuedAt(new Date(System.currentTimeMillis()))
				.setExpiration(new Date(System.currentTimeMillis() + refreshTime))
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}

	public LocalDateTime getExpiryDateTime() {
		return LocalDateTime.now().plusNanos(refreshTime * 1_000_000L);
	}

	public Claims extractAllClaims(String token) throws Exception {
		return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
	}

	public String extractUsername(String token) throws Exception {
		return extractAllClaims(token).getSubject();
	}

	public boolean validateToken(String token, String username) throws Exception {
		try {
			if (isTokenExpired(token)) {
				return false;
			}
			final String extractedUsername = extractUsername(token);
			return (extractedUsername.equals(username));
		} catch (Exception e) {
			return false;
		}
	}

	public boolean isTokenExpired(String token) {
		try {
			Claims claims = extractAllClaims(token);
			return claims.getExpiration().before(new Date());
		} catch (Exception e) {
			return true;
		}
	}

	public boolean isRefreshTokenValid(String token) {
		return !isTokenExpired(token);
	}
}
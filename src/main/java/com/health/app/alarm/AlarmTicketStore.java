package com.health.app.alarm;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

@Component
public class AlarmTicketStore {

	private static final long TTL_MILLIS = 60_000L;

	private static final int PURGE_INTERVAL = 100;

	private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
	private final SecureRandom random = new SecureRandom();
	private final AtomicInteger issueCount = new AtomicInteger();

	private record Ticket(Long username, Long expiredAt) {
	}

	public String issue(Long username) {
		if (issueCount.incrementAndGet() % PURGE_INTERVAL == 0) {
			purgeExpired();
		}

		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

		tickets.put(ticket, new Ticket(username, System.currentTimeMillis() + TTL_MILLIS));
		return ticket;
	}

	public Long consume(String ticket) {
		if (ticket == null || ticket.isBlank()) {
			return null;
		}
		Ticket found = tickets.remove(ticket);
		if (found == null || found.expiredAt() < System.currentTimeMillis()) {
			return null;
		}
		return found.username();
	}

	private void purgeExpired() {
		long now = System.currentTimeMillis();
		tickets.values().removeIf(ticket -> ticket.expiredAt < now);
	}

}

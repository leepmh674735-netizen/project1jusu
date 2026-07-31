package com.health.app.alarm;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Repository
public class AlarmRepository {

	private final Map<String, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

	public void save(String username, SseEmitter sseEmitter) throws Exception {
		emitters.computeIfAbsent(username, key -> ConcurrentHashMap.newKeySet()).add(sseEmitter);
	}

	public Set<SseEmitter> get(String username) throws Exception {
		Set<SseEmitter> found = emitters.get(username);
		return found == null ? Collections.emptySet() : found;
	}

	public void remove(String username, SseEmitter sseEmitter) {
		emitters.computeIfPresent(username, (key, set) -> {
			set.remove(sseEmitter);
			return set.isEmpty() ? null : set;
		});
	}

}
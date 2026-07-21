package com.health.app.alarm;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Repository
public class AlarmRepository {
	
	private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
	
	public void save(String username, SseEmitter emitter) {
		emitters.put(username, emitter);
	}
	
	public SseEmitter get(String username) {
		return emitters.get(username);
	}
	
	public void remove(String username) {
		emitters.remove(username);
	}

}
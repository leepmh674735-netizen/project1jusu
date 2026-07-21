package com.health.app.ai;

public class AuthContext {

	private final Long username;
	private final String role;
	private final Long gymId;

	public AuthContext(Long username, String role, Long gymId) {
		this.username = username;
		this.role = role;
		this.gymId = gymId;
	}

	public Long getUsername() {
		return username;
	}

	public String getRole() {
		return role;
	}

	public Long getGymId() {
		return gymId;
	}

}

package com.health.app.member;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class MemberDTO {

	private Long username;
	private String password;
	private String passwordCheck;
	private String name;
	private String email;
	private String role;
	private Long gymId;
	private LocalDate birth;
	private String status;

	public void setUsernameFromString(String rawUsername) {
		if (rawUsername == null || rawUsername.isBlank()) {
			this.username = null;
			return;
		}

		String digits = rawUsername.replaceAll("[^0-9]", "");
		if (digits.isBlank()) {
			this.username = null;
			return;
		}

		try {
			this.username = Long.parseLong(digits);
		} catch (NumberFormatException e) {
			this.username = null;
		}
	}
}
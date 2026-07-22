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

	public void setUsername(Long username) {
		this.username = username;
	}

	public void setUsername(String username) {
		if (username != null && !username.isBlank()) {
			try {
				this.username = Long.parseLong(username);
			} catch (NumberFormatException e) {
				this.username = null;
			}
		} else {
			this.username = null;
		}
	}

	public Long getUsername() {
		return this.username;
	}

	// ⭐ getUsernameAsLong() 호출 시 에러를 없애주는 메소드 추가
	public Long getUsernameAsLong() {
		return this.username;
	}

}
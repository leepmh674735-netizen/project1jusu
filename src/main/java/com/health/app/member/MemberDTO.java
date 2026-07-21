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

}
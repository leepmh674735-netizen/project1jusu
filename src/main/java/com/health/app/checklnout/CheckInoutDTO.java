package com.health.app.checklnout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CheckInoutDTO {

	private Long id;
	private Long username;
	private LocalDateTime checkIn;
	private Long duration;

	private Long gymId;
	private Long inoutType;
	private Long trainerId;
	private LocalDateTime trainerConfirm;

	private String memberName;
	private String trainerName;
	private Integer remainCount;

}

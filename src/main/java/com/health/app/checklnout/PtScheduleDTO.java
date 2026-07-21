package com.health.app.checklnout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PtScheduleDTO {

	private Long scheduledId;
	private Long trainerId;
	private Long username;
	private Long gymId;
	private String memo;
	private LocalDateTime createdAt;

	private String memberName;
	private String trainerName;

}

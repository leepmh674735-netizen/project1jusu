package com.health.app.checklnout;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class GymPerfDTO {

	private Long gymId;
	private String gymName;
	private Integer trainerCount;
	private Integer monthDone;
	private Integer rebookCount;
	private Integer expiringCount;

}

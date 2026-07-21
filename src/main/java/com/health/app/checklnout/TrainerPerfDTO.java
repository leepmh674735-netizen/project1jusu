package com.health.app.checklnout;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class TrainerPerfDTO {

	private Long username;
	private String name;
	private Integer memberCount;
	private Integer monthDone;
	private Integer monthMissed;
	private Integer rebookCount;

}

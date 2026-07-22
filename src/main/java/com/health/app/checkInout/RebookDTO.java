package com.health.app.checkInout;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class RebookDTO {

	private String category;
	private Long dataId;
	private Long username;
	private String memberName;
	private String trainerName;
	private Integer remainingCount;
	private LocalDate endDate;

}

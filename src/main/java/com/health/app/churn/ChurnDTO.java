package com.health.app.churn;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnDTO {

	private Long modelId;
	private Long username;
	private Long age;
	private Long totalMonth;
	private Double visitPerWeek;
	private Double averExercise;
	private Boolean ptYn;
	private Boolean groupYn;
	private Long timeCong;
	private String contractType;

}

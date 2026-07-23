package com.health.app.survey;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class SurveyDTO {
	
	private Long surveyId;
	private Long username;
	private Long costRate;
	private Long employeeRate;
	private Long serviceRate;
	private Long equipRate;
	private Boolean injuryIssue;
	private String injuryArea;

}
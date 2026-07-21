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
	private Long serviceRate1;
	private Long seriviceRate2;
	private Long equipRate1;
	private Long equipRate2;
	private Long employRate1;
	private Boolean injuryIssue;
	private String injuryArea;

}

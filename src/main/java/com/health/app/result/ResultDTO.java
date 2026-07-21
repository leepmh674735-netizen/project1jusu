package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ResultDTO {

	private Long resultId;
	private Long username;
	private Double churnRate;
	private String top1Reason;
	private String top2Reason;
	private String top3Reason;
	private java.time.LocalDate churnDate;

}

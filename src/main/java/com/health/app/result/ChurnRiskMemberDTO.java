package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnRiskMemberDTO {

	private Long username;
	private String name;
	private Double churnRate;
	private String top1Reason;
	private String top2Reason;
	private String top3Reaon;

}

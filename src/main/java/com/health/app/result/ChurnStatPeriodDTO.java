package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnStatPeriodDTO {
	
	private String period;
	private Integer totalMembers;
	private Integer riskMembers;
	private Double avgChurnRate;

}

package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnStatItemDTO {
	
	private String statType;
	private String statKey;
	private Integer memberCount;
	private Double pct;

}

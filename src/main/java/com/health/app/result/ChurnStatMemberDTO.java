package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnStatMemberDTO {
	
	private Long username;
	private String name;
	private Double churnRate;

}

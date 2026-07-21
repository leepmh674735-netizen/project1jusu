package com.health.app.contract;

import java.time.LocalDate;

import com.health.app.member.MemberDTO;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class TrialTargetDTO {
	
	private Long couponId;
	private Long couponNum;
	private String couponName;
	private Long couponCount;
	private LocalDate couponExpire;
	
	private MemberDTO member;
	
	private Long baseDateId;
	private Long baseContract;
	private Long baseManagerId;
	
	

}

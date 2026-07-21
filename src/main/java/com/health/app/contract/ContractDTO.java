package com.health.app.contract;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.health.app.member.MemberDTO;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ContractDTO {

	private Long dataId;
	private Long contract;
	private Long gymId;
	private Long receiverId;
	private String receiverName;

	private String status;
	private Long previousDataId;
	private Long relatedDateId;
	private Long sourceCouponId;
	private LocalDate startDate;
	private LocalDate endDate;
	private Long amount;

	private Double contractRate;

	private Integer quantity;
	private Integer remainingCount;
	private LocalDate issueDate;

	private LocalDateTime signedAt;
	private Long mangerId;
	private LocalDate birthDate;
	private Integer avgWorkoutHour;
	private Integer avgWorkoutMinute;

	private String gymName;
	private MemberDTO member;

	private String username;
	private String role;
	private String content;
	private String keyword;

	private String senderId;

}
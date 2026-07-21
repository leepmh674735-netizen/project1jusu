package com.health.app.complaint;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ComplaintDTO {
	
	private Long complainId;
	private Long username;
	private Long gymId;
	private String title;
	private String content;
	private LocalDate createAt;
	private String status;

}

package com.health.app.alarm;



import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AlarmDTO {
	
	private Long alarmId;
	private Long receiver;
	private Long sender;
	private String message;
	private String link;
	private LocalDate createdAt;
	private LocalDateTime readAt;
	private String category;
	private String read;

}

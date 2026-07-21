package com.health.app.dashboard;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class DashboardDTO {
	
	private Long widgetId;
	private Long username;
	private Long gymId;
	private String role;
	private String widgetKey;   
	private Boolean isActive;   
	private Boolean hasData;    
	private Long sortOrder;
	private LocalDateTime updatedAt;

}
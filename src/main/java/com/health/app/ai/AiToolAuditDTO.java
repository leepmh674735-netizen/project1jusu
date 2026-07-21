package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AiToolAuditDTO {

	private Long auditId;
	private Long conversationId;
	private Long messageId;
	private Long username;
	private Long gymId;
	private String toolName;
	private String classification;
	private String params;
	private String status;
	private String resultSummary;
	private String error;
	private LocalDateTime createdAt;

}

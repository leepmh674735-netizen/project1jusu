package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AiMessageDTO {

	private Long messageId;
	private Long conversationId;
	private String role;
	private String toolName;
	private String toolArgs;
	private String toolResult;
	private Long tokenOut;
	private LocalDateTime createdAt;

}

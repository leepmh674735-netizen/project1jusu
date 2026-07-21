package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AiConversationDTO {

	private Long conversationId;
	private Long username;
	private Long gymId;
	private String role;
	private String title;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

}

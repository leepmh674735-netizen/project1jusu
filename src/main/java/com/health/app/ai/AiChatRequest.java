package com.health.app.ai;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AiChatRequest {
	
	private Long conversationId;
	private String message;

}

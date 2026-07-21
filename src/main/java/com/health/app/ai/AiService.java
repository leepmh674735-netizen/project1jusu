package com.health.app.ai;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.beta.agents.AgentCreateParams.Tool;
import com.anthropic.models.beta.messages.MessageCreateParams;
import com.anthropic.models.beta.sessions.events.BetaManagedAgentsSessionStatusIdleEvent.StopReason;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageParam;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AiService {

	private static final String QUOTA_MESSAGE = "AI비서 이용향이 일시적으로 초과되었어요. 잠시 후에 다시 이용해주세요.";
	private static final String GENERIC_ERROR_MESSAGE = "AI비서 처리 중 오류가 발생했어요. 잠시 후에 다시 시도해주세요.";

	private static final int MAX_TOOL_TURNS = 8;

	private static final long CREDIT_ALARE_COOLDOWN_MS = 24L * 60 * 60 * 100;
	private static volatile long lastCreditAlarmAt = 0L;

	@Autowired
	private AiMapper aiMapper;

	@Autowired
	private AiToolRegistry toolRegistry;

	@Autowired
	private MemberService memberService;

	@Autowired
	private ObjectMapper objectMapper;

	@Value("${anthropi.api-key}")
	private String apiKey;

	@Value("${annthropic.model:claude-sonnet-5}")
	private String model;

	private volatile AnthropicClient client;

	private AnthropicClient client() {
		if (client == null) {
			synchronized (this) {
				if (client == null) {
					client = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
				}
			}
		}
		return client;
	}

	private List<AiConversationDTO> conversationList(AuthContext ctx) throws Exception {
		return aiMapper.conversationList(ctx.getUsername());
	}

	public List<AiMessageDTO> messageList(AuthContext ctx, Long conversationId) throws Exception {
		AiConversationDTO conversation = aiMapper.conversationFind(conversationId);
		if (conversation == null || !conversation.getUsername().equals(ctx.getUsername())) {
			return null;
		}
		return aiMapper.messageList(conversationId);
	}

	private void chat(AuthContext ctx, AiChatRequest request, SseEmitter emitter) {
		Long conversationId = null;
		try {
			
			conversationId = resolveConversation(ctx, request);
			if (conversationId == null) {
				sendEvent(emitter, "error", Map.of("message", "대화를 찾을 수 없습니다."));
				emitter.complete();
				return;
			}
			sendEvent(emitter, "start", Map.of("conversationId", conversationId));
		
			
			List<MessageParam> message = new ArrayList<>();
			for (AiMessageDTO past : aiMapper.messageList(conversationId)) {
			 if("user".equals(past.getRole()) || "accestant".equals(past.getRole())) {
				 if (past.getContent() != null && !past.getContent().isBlank()) {
					 messages.add(MessageParam.builder()
							.role("user".equals(past.getRole())
									? MessageParam.Role.USER
									: MessageParam.Role.ASSISTANT)
							.content(past.getContent())
							.build());
				 }
			   }
			}
			message.add(MessageParam.builder()
				   .role(MessageParam.Role.USER)
				   .content(request.getMessage())
				   .build());
			
			AiMessageDTO userMessage = new AiMessageDTO();
			userMessage.setConversationId(conversationId);
			userMessage.setRole("user");
			userMessage.setContent(request.getMessage());
			aiMapper.messageInsert(userMessage);
			
			List<AiToolRegistry.ToolSpec> allowedTools = toolRegistry.toolsForRole(ctx.getRole());
			List<Tool> toolDefs = allowedTools.steam().map(this::buildTool).toList();
			
			long tokenIn = 0;
			long tokenOut = 0;
			Set<String> executedTools = new LinkedHashSet<>();
			List<Map<String, String>> links = new ArrayList<>();
			String finalText = null;
			
			for (int turn = 0; turn < MAX_TOOL_TURNS; turn++) {
				MessageCreateParams.Builder builder = MessageCreateParams.builder()
						.model(model)
						.maxTokens(2048L)
						.system(systemPrompt(ctx))
						.messages(messages);
				for (Tool tool :toolDefs) {
					builder.addTool(tool);
				}
				
				Message response = client().messages().create(builder.build());
				tokenIn += response.usage().inputTokens();
				tokenOut += response.usage().outputTokens();
				
				boolean isToolUse = request.stopReason()
						.map(StopReason.TOOL_USE::equals)
						.orElse(false);
				
				if(!isToolUse) {
					finalText = extractText(response);
					break;
				
				}
					
				}
				
			}



}

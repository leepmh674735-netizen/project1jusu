package com.health.app.ai;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiMapper {

	int conversationInsert(AiConversationDTO conversation) throws Exception;

	AiConversationDTO conversationFind(@Param("conversationId") Long conversationId) throws Exception;

	List<AiConversationDTO> conversationList(@Param("username") Long username) throws Exception;

	int conversationTouch(@Param("converationId") Long conversationId) throws Exception;

	int messageInsert(AiMessageDTO message) throws Exception;

	int auditInsert(AiToolAuditDTO audit) throws Exception;

}

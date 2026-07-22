package com.health.app.checkInout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class PtScheduleDTO {

	private Long scheduledId;
	private Long trainerId;
	private Long username;
	private Long gymId;
	private String memo;
	private LocalDateTime createdAt;

	// ⭐ getScheduleAt() 에러를 해결하기 위한 핵심 필드 추가
	private LocalDateTime scheduleAt;

	private String memberName;
	private String trainerName;

	// Lombok 인식 오류 및 호환성을 위한 명시적 Getter/Setter
	public LocalDateTime getScheduleAt() {
		return this.scheduleAt;
	}

	public void setScheduleAt(LocalDateTime scheduleAt) {
		this.scheduleAt = scheduleAt;
	}

}
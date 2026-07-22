package com.health.app.churn;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ChurnBatchScheduler {

	private static final Logger log = LoggerFactory.getLogger(ChurnBatchScheduler.class);

	private final RestTemplate restTemplate = new RestTemplate();

	@Value("${app.churn.fastapi-url:http://localhost:8080}")
	private String churnFastapiUrl;

	@Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
	public void runDailyChurnBatch() {
		triggerBatch("일일 스케줄");
	}

	@EventListener(ApplicationReadyEvent.class)
	public void runOnStartup() {
		triggerBatch("앱 시작");
	}

	private void triggerBatch(String trigger) {
		String url = churnFastapiUrl + "/churn/batch";
		log.info("[ChurnBatch] {} - 이탈 예측 배치 시작 → {}", trigger, url);
		try {
			RequestEntity<Void> request = RequestEntity.method(HttpMethod.POST, URI.create(url)).build();
			ResponseEntity<String> response = restTemplate.exchange(request, String.class);
			log.info("[ChurnBatch] {} 완료: status={}, body={}", trigger, response.getStatusCode(), response.getBody());
		} catch (Exception e) {
			log.error("[ChurnBatch] {} 실패: {}", trigger, e.getMessage(), e);
		}
	}
}
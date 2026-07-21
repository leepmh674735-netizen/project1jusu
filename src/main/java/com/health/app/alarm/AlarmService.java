package com.health.app.alarm;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class AlarmService {

	@Autowired
	private AlarmRepository alarmRepository;

	@Autowired
	private AlarmMapper alarmMapper;

	private static final Long DEFAULT_TIMEOUT = 1000L * 60 * 30;

	public SseEmitter subscribe(String username) throws Exception {

		SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

		emitter.onCompletion(() -> alarmRepository.remove(username));
		emitter.onTimeout(() -> alarmRepository.remove(username));

		try {
			emitter.send(SseEmitter.event().name("contect").data("실시간 알림 연결이 완료되었습니다."));
		} catch (Exception e) {
			alarmRepository.remove(username);
			throw new RuntimeException("최조 연결 생성 실패");
		}

		alarmRepository.save(username, emitter);

		return emitter;
	}

	public void sendAlarm(Long receiver, Long sender, String message, String link, String category) throws Exception {
		String username = String.valueOf(receiver);
		SseEmitter emitter = alarmRepository.get(username);
		
		AlarmDTO alarmDTO = new AlarmDTO();
		alarmDTO.setReceiver(receiver);
		alarmDTO.setSender(sender);
		alarmDTO.setMessage(message);
		alarmDTO.setLink(link);
		alarmDTO.setCategory(category);
		alarmMapper.alarmAdd(alarmDTO);
		
		if (emitter != null) {
			try {
				emitter.send(SseEmitter.event().name("alarm").data(alarmDTO));
			} catch (IOException e) {
				alarmRepository.remove(username);
			}
		}
	}

	public java.util.List<AlarmDTO> alarmList(Long receiver) throws Exception {
		return alarmMapper.alarmList(receiver);
	}

	public int alarmRead(Long alarmId) throws Exception {
		return alarmMapper.alarmRead(alarmId);
	}

	public int deleteOldAlarms() throws Exception {
		return alarmMapper.deleteOld(java.time.LocalDate.now().minusMonths(1));
	}

	public int readAllAlarms(Long receiver) throws Exception {
		return alarmMapper.readAllByReceiver(receiver);
	}
}
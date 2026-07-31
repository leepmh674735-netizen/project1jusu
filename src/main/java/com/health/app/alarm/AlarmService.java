package com.health.app.alarm;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.List;

@Service
public class AlarmService {

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private AlarmMapper alarmMapper;

    @Autowired
    private AlarmTicketStore alarmTicketStore;

    private static final Long DEFAULT_TIMEOUT = 1000L * 60 * 30;

    public String issueSubscribeTicket(Long username) {
        return alarmTicketStore.issue(username);
    }

    public SseEmitter subscribeByTicket(String ticket) throws Exception {
        Long owner = alarmTicketStore.consume(ticket);
        if (owner == null) {
            return null;
        }
        return subscribe(String.valueOf(owner));
    }

    private SseEmitter subscribe(String username) throws Exception {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        emitter.onCompletion(() -> alarmRepository.remove(username, emitter));
        emitter.onTimeout(() -> alarmRepository.remove(username, emitter));
        emitter.onError(e -> alarmRepository.remove(username, emitter));

        try {
            emitter.send(SseEmitter.event().name("connect").data("실시간 알람 연결이 완료되었습니다."));
        } catch (IOException e) {
            alarmRepository.remove(username, emitter);
            throw new RuntimeException("최초 연결 생성 실패");
        }

        alarmRepository.save(username, emitter);

        return emitter;
    }

    public void sendAlarm(Long receiver, Long sender, String message, String link, String category) throws Exception {
        String username = String.valueOf(receiver);

        AlarmDTO alarmDTO = new AlarmDTO();
        alarmDTO.setReceiver(receiver);
        alarmDTO.setSender(sender);
        alarmDTO.setMessage(message);
        alarmDTO.setLink(link);
        alarmDTO.setCategory(category);
        alarmMapper.alarmAdd(alarmDTO);

        for (SseEmitter emitter : alarmRepository.get(username)) {
            try {
                emitter.send(SseEmitter.event().name("alarm").data(alarmDTO));
            } catch (Exception e) {
                alarmRepository.remove(username, emitter);
            }
        }
    }

    public List<AlarmDTO> alarmList(Long receiver) throws Exception {
        return alarmMapper.alarmList(receiver);
    }

    public int alarmRead(Long alarmId, Long receiver) throws Exception {
        return alarmMapper.alarmRead(alarmId, receiver);
    }

    public int deleteOldAlarms() throws Exception {
        return alarmMapper.deleteOld(java.time.LocalDate.now().minusMonths(1));
    }

    public int readAllAlarms(Long receiver) throws Exception {
        return alarmMapper.readAllByReceiver(receiver);
    }
}
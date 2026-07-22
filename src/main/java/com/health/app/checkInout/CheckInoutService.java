package com.health.app.checkInout;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;

@Service
public class CheckInoutService {

    private static final int REBOOK_THRESHOLD = 3;

    @Autowired
    private CheckInoutMapper checkInoutMapper;

    @Autowired
    private MemberService memberService;

    @Autowired
    private AlarmService alarmService;

    public List<CheckInoutDTO> list(Long username) throws Exception {
        return checkInoutMapper.list(username);
    }

    public CheckInoutDTO gymCheckIn(MemberDTO credential) throws Exception {
        MemberDTO member = verifyMember(credential);

        ContractDTO contract = checkInoutMapper.findActiveContract(member.getUsername(), 3L);
        if (contract == null) {
            contract = checkInoutMapper.findActiveContract(member.getUsername(), 4L);
        }
        if (contract == null) {
            throw new IllegalStateException("이용 가능한 헬스장 이용권 또는 PT 계약이 없습니다.");
        }
        if (checkInoutMapper.countToday(member.getUsername(), 1L) > 0) {
            throw new IllegalStateException("오늘은 이미 헬스장 출석을 완료했습니다.");
        }

        CheckInoutDTO row = new CheckInoutDTO();
        row.setUsername(member.getUsername());
        row.setGymId(contract.getGymId());
        row.setInoutType(1L);
        checkInoutMapper.insertAttendance(row);

        row.setMemberName(member.getName());
        return row;
    }

    public CheckInoutDTO ptCheckIn(MemberDTO credential) throws Exception {
        MemberDTO member = verifyMember(credential);

        ContractDTO contract = checkInoutMapper.findConsumablePtContract(member.getUsername());
        if (contract == null) {
            throw new IllegalStateException("잔여 횟수가 남은 유효한 PT 계약이 없습니다.");
        }
        if (contract.getManagerId() == null) {
            throw new IllegalStateException("담당 트레이너가 지정되지 않은 계약입니다. 관리자에게 문의해 주세요.");
        }
        if (checkInoutMapper.countToday(member.getUsername(), 2L) > 0) {
            throw new IllegalStateException("오늘은 이미 PT 출석을 접수했습니다.");
        }

        CheckInoutDTO row = new CheckInoutDTO();
        row.setUsername(member.getUsername());
        row.setGymId(contract.getGymId());
        row.setInoutType(2L);
        row.setTrainerId(contract.getManagerId());
        checkInoutMapper.insertAttendance(row);

        sendAlarmSafely(contract.getManagerId(), member.getUsername(),
                member.getName() + "님이 PT 출석을 접수했습니다. 출석 확인 시 잔여 횟수가 차감됩니다.",
                "/fitb?tab=management", "PT_CHECKIN");

        row.setMemberName(member.getName());
        row.setRemainingCount(contract.getRemainCount());
        return row;
    }

    public List<CheckInoutDTO> pendingList(Long trainerUsername) throws Exception {
        return checkInoutMapper.pendingList(trainerUsername);
    }

    public List<CheckInoutDTO> historyList(Long trainerUsername) throws Exception {
        return checkInoutMapper.historyList(trainerUsername);
    }

    @Transactional(rollbackFor = Exception.class)
    public int confirmPt(Long inoutId, Long trainerUsername) throws Exception {
        CheckInoutDTO row = checkInoutMapper.findAttendance(inoutId);
        if (row == null || row.getInoutType() == null || row.getInoutType() != 2L
                || !trainerUsername.equals(row.getTrainerId())) {
            throw new IllegalStateException("본인 담당 PT 출석 건이 아닙니다.");
        }
        if (row.getTrainerConfirm() != null) {
            throw new IllegalStateException("이미 확인 처리된 출석입니다.");
        }

        ContractDTO contract = checkInoutMapper.findConsumablePtContract(row.getUsername());
        if (contract == null) {
            throw new IllegalStateException("잔여 횟수가 남은 유효한 PT 계약이 없습니다.");
        }
        if (contract.getQuantity() == null || contract.getQuantity() <= 0) {
            throw new IllegalStateException("계약에 PT 총 횟수 정보가 없습니다.");
        }

        if (checkInoutMapper.confirmAttendance(inoutId, trainerUsername) != 1) {
            throw new IllegalStateException("당일 출석 건만 확인할 수 있습니다.");
        }

        checkInoutMapper.upsertPtManage(contract.getDataId(), row.getUsername(), contract.getQuantity());
        if (checkInoutMapper.usePtCount(contract.getDataId()) != 1) {
            throw new IllegalStateException("잔여 PT 횟수가 없어 차감할 수 없습니다.");
        }

        int remaining = contract.getQuantity() - checkInoutMapper.findUsedCount(contract.getDataId());

        if (remaining == REBOOK_THRESHOLD) {
            String memberLabel = row.getMemberName() != null ? row.getMemberName() : String.valueOf(row.getUsername());
            sendAlarmSafely(trainerUsername, null,
                    memberLabel + "님의 잔여 PT가 " + remaining + "회 남았습니다. 재등록 제안을 고려해 보세요.",
                    "/fitb?tab=management", "PT_REBOOK");

            MemberDTO owner = memberService.findOwnerByGymId(contract.getGymId());
            if (owner != null) {
                sendAlarmSafely(owner.getUsername(), null,
                        memberLabel + "님의 잔여 PT가 " + remaining + "회 남았습니다. 재등록 프로모션을 검토해 보세요.",
                        "/fitb?tab=promotion", "PT_REBOOK");
            }
        }

        return remaining;
    }

    public List<MemberDTO> myMembers(Long trainerUsername) throws Exception {
        return checkInoutMapper.myMembers(trainerUsername);
    }

    public List<PtMemberStatusDTO> memberStatusList(Long trainerUsername) throws Exception {
        return checkInoutMapper.memberStatusList(trainerUsername);
    }

    public PtScheduleDTO scheduleAdd(Long trainerUsername, PtScheduleDTO schedule) throws Exception {
        if (schedule.getUsername() == null || schedule.getScheduleAt() == null) {
            throw new IllegalStateException("회원과 수업 일시를 입력해 주세요.");
        }
        ContractDTO contract = checkInoutMapper.findActivePtByTrainer(schedule.getUsername(), trainerUsername);
        if (contract == null) {
            throw new IllegalStateException("본인 담당 PT 회원이 아닙니다.");
        }
        schedule.setTrainerId(trainerUsername);
        schedule.setGymId(contract.getGymId());
        checkInoutMapper.insertSchedule(schedule);
        return schedule;
    }

    public List<PtScheduleDTO> trainerScheduleList(Long trainerUsername) throws Exception {
        return checkInoutMapper.trainerScheduleList(trainerUsername);
    }

    public List<PtScheduleDTO> memberScheduleList(Long username) throws Exception {
        return checkInoutMapper.memberScheduleList(username);
    }

    public void scheduleDelete(Long scheduleId, Long trainerUsername) throws Exception {
        if (checkInoutMapper.deleteSchedule(scheduleId, trainerUsername) != 1) {
            throw new IllegalStateException("본인이 등록한 일정만 삭제할 수 있습니다.");
        }
    }

    public Long resolveGymId(Long username) throws Exception {
        Long gymId = checkInoutMapper.findGymIdByUsername(username);
        if (gymId == null) {
            throw new IllegalStateException("계정에 지점 정보가 없습니다.");
        }
        return gymId;
    }

    public List<TrainerPerfDTO> ownerTrainerPerf(Long gymId) throws Exception {
        return checkInoutMapper.ownerTrainerPerf(gymId);
    }

    public List<RebookDTO> ownerRebookList(Long gymId) throws Exception {
        return checkInoutMapper.ownerRebookList(gymId);
    }

    public List<PtScheduleDTO> ownerScheduleList(Long gymId) throws Exception {
        return checkInoutMapper.ownerScheduleList(gymId);
    }

    public List<CheckInoutDTO> ownerHistoryList(Long gymId) throws Exception {
        return checkInoutMapper.ownerHistoryList(gymId);
    }

    public List<GymPerfDTO> adminGymOverview() throws Exception {
        return checkInoutMapper.adminGymOverview();
    }

    public int sendTomorrowReminders() throws Exception {
        List<PtScheduleDTO> schedules = checkInoutMapper.tomorrowSchedules();
        for (PtScheduleDTO schedule : schedules) {
            String time = schedule.getScheduleAt().toLocalTime().toString().substring(0, 5);

            String trainerLabel = schedule.getTrainerName() != null ? schedule.getTrainerName() + " 트레이너" : "담당 트레이너";
            sendAlarmSafely(schedule.getUsername(), null,
                    "내일 " + time + " PT 수업이 예정되어 있습니다. (" + trainerLabel + ")",
                    "/fitc/mypage/checkin", "PT_REMIND");

            String memberLabel = schedule.getMemberName() != null ? schedule.getMemberName() : String.valueOf(schedule.getUsername());
            sendAlarmSafely(schedule.getTrainerId(), null,
                    "내일 " + time + " " + memberLabel + "님 PT 수업이 예정되어 있습니다.",
                    "/fitb?tab=management", "PT_REMIND");
        }
        return schedules.size();
    }

    private MemberDTO verifyMember(MemberDTO credential) throws Exception {
        MemberDTO member = memberService.login(credential);
        if (member == null) {
            throw new IllegalStateException("전화번호 또는 비밀번호가 올바르지 않습니다.");
        }
        return member;
    }

    private void sendAlarmSafely(Long receiver, Long sender, String message, String link, String category) {
        if (receiver == null) return;
        try {
            alarmService.sendAlarm(receiver, sender, message, link, category);
        } catch (Exception e) {
            System.err.println("알림 발송 실패 (receiver=" + receiver + ", category=" + category + "): " + e.getMessage());
        }
    }
}
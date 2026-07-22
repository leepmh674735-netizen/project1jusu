package com.health.app.complaint;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;

@Service
public class ComplaintService {

	@Autowired
	private ComplaintMapper complaintMapper;

	@Autowired
	private MemberService memberService;

	@Autowired
	private AlarmService alarmService;

	@Transactional
	public int create(ComplaintDTO complaintDTO) throws Exception {
		int result = complaintMapper.create(complaintDTO);

		if (result > 0) {
			
			MemberDTO owner = memberService.findOwnerByGymId(complaintDTO.getGymId());
			if (owner != null) {
				
				alarmService.sendAlarm(owner.getUsername(), complaintDTO.getUsername(),
						"새로운 건의 사항이 등록되었습니다: " + complaintDTO.getTitle(), "/fitb/b2mypage/b2complaint", "COMPLAINT");
			}
		}
		return result;
	}

	public List<ComplaintDTO> memberList(Long username) throws Exception {
		return complaintMapper.memberList(username);
	}
	
	public List<ComplaintDTO> ownerList(Long gymId) throws Exception {
		return complaintMapper.ownerList(gymId);
	}
	
	@Transactional
	public int update(ComplaintDTO complaintDTO) throws Exception {
		
		ComplaintDTO original = complaintMapper.getComplaintById(complaintDTO.getComplaintId());
		
		int result = complaintMapper.update(complaintDTO);
		
		if (result > 0 && original != null) {
			MemberDTO owner = memberService.findOwnerByGymId(original.getGymId());
			Long senderId = owner != null ? owner.getUsername() : null;
			
			alarmService.sendAlarm(
					original.getUsername(),
					senderId,
					"보내신 건의사항의 처리 상태가 [" + complaintDTO.getStatus() + "](으)로 변경되었습니다.",
					"/fitc/mypage/b2complaint",
					"COMPLAINT"
			);
		}
		return result;
	}
}
package com.health.app.checkInout;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;

@Mapper
public interface CheckInoutMapper {

	public List<CheckInoutDTO> list(Long username) throws Exception;

	public ContractDTO findActiveContract(@Param("username") Long username, 
			@Param("contractType") Long contractType) throws Exception;

	public ContractDTO findConsumablePtContract(Long username) throws Exception;

	public int countToday(@Param("username") Long username, 
			@Param("inoutType") Long inoutType) throws Exception;

	public int insertAttendance(CheckInoutDTO checkInoutDTO) throws Exception;

	public List<CheckInoutDTO> pendingList(Long trainerId) throws Exception;

	public List<CheckInoutDTO> historyList(Long trainerId) throws Exception;

	public CheckInoutDTO findAttendance(Long inoutId) throws Exception;

	public int confirmAttendance(@Param("inoutId") Long inoutId, 
			@Param("trainerId") Long trainerId) throws Exception;

	public int upsertPtManage(@Param("dataId") Long dataId, 
			@Param("username") Long username,
			@Param("totalCount") Integer totalCount) throws Exception;

	public int usePtCount(Long dataId) throws Exception;

	public int findUsedCount(Long dataId) throws Exception;

	public List<MemberDTO> myMembers(Long trainerId) throws Exception;

	public List<PtMemberStatusDTO> memberStatusList(Long trainerId) throws Exception;

	public ContractDTO findActivePtByTrainer(@Param("username") Long username,
			@Param("trainerId") Long trainerId) throws Exception;

	public int insertSchedule(PtScheduleDTO schedule) throws Exception;

	public List<PtScheduleDTO> trainerScheduleList(Long trainerId) throws Exception;

	public List<PtScheduleDTO> memberScheduleList(Long username) throws Exception;

	public int deleteSchedule(@Param("scheduleId") Long scheduleId,
			@Param("trainerId") Long trainerId) throws Exception;

	public List<PtScheduleDTO> tomorrowSchedules() throws Exception;

	public Long findGymIdByUsername(Long username) throws Exception;

	public List<TrainerPerfDTO> ownerTrainerPerf(Long gymId) throws Exception;

	public List<RebookDTO> ownerRebookList(Long gymId) throws Exception;

	public List<PtScheduleDTO> ownerScheduleList(Long gymId) throws Exception;

	public List<CheckInoutDTO> ownerHistoryList(Long gymId) throws Exception;

	public List<GymPerfDTO> adminGymOverview() throws Exception;

}
package com.health.app.alarm;

import java.time.LocalDate;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AlarmMapper {

	public int alarmAdd(AlarmDTO alarmDTO) throws Exception;

	public List<AlarmDTO> alarmList(Long receiver) throws Exception;

	public int alarmRead(@Param("alarmId") Long alarmId, @Param("receiver") Long receiver) throws Exception;

	public int readAllByReceiver(Long receiver) throws Exception;

	public int deleteOld(LocalDate cutoff) throws Exception;
}
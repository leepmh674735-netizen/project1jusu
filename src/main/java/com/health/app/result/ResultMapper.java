package com.health.app.result;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ResultMapper {

	public ResultDTO selectByDataId(@Param("dataId") Long dataId) throws Exception;

	public List<ResultDTO> selectAll(@Param("gymId") Long gymId) throws Exception;

	public List<ChurnStatPeriodDTO> selectStatPeriods(
			@Param("gymId") Long gymId, 
			@Param("mode") String mode) throws Exception;

	public List<ChurnStatItemDTO> selectStatBreakdown(
			@Param("gymId") Long gymId, 
			@Param("mode") String mode, 
			@Param("period") String period) throws Exception;

	public List<ChurnStatMemberDTO> selectStatMembers(
			@Param("gymId") Long gymId, 
			@Param("mode") String mode, 
			@Param("period") String period, 
			@Param("statType") String statType, 
			@Param("statKey") String statKey) throws Exception;

	public List<ChurnRiskMemberDTO> selectRiskMembers(
			@Param("gymId") Long gymId, 
			@Param("mode") String mode, 
			@Param("period") String period) throws Exception;

	public List<ChurnStatMemberDTO> selectMembersByChurn(@Param("gymId") Long gymId) throws Exception;

	public List<ChurnStatMemberDTO> selectMembersByFactor(
			@Param("gymId") Long gymId, 
			@Param("statKey") String statKey) throws Exception;

}
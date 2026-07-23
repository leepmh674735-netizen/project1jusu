package com.health.app.survey;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SurveyMapper {

	public int create(SurveyDTO surveyDTO) throws Exception;

	public SurveyDTO selectByUsername(@Param("username") Long username) throws Exception;

	public List<SurveyDTO> selectAll() throws Exception;
}
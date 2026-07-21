package com.health.app.survey;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SurveyMapper {

	int create(SurveyDTO surveyDTO);

	SurveyDTO selectByUsername(@Param("username") String username);

	List<SurveyDTO> selectAll();
}
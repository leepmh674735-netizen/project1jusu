package com.health.app.survey;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SurveyMapper {

    int create(SurveyDTO surveyDTO) throws Exception;

    SurveyDTO selectByUsername(@Param("username") Long username) throws Exception;

    List<SurveyDTO> selectAll() throws Exception;
}
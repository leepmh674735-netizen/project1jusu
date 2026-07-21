package com.health.app.survey;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SurveyService {

	private final SurveyMapper surveyMapper;

	public SurveyService(SurveyMapper surveyMapper) {
		this.surveyMapper = surveyMapper;
	}

	public int create(SurveyDTO surveyDTO) {
		return surveyMapper.create(surveyDTO);
	}

	public SurveyDTO selectByUsername(String username) {
		return surveyMapper.selectByUsername(username);
	}

	public List<SurveyDTO> selectAll() {
		return surveyMapper.selectAll();
	}
}
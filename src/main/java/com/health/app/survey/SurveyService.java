package com.health.app.survey;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SurveyService {

	private final SurveyMapper surveyMapper;

	public SurveyService(SurveyMapper surveyMapper) {
		this.surveyMapper = surveyMapper;
	}

	public int create(SurveyDTO surveyDTO) throws Exception {
		return surveyMapper.create(surveyDTO);
	}

	public SurveyDTO selectByUsername(Long username) throws Exception {
		if (username == null) {
			return null;
		}
		return surveyMapper.selectByUsername(username);
	}

	public List<SurveyDTO> selectAll() throws Exception {
		return surveyMapper.selectAll();
	}
}
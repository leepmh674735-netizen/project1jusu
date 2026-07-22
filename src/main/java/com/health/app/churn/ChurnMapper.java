package com.health.app.churn;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChurnMapper {

	public int create(ChurnDTO churnDTO) throws Exception;

	public ChurnDTO selectByUsername(Long username) throws Exception;

	public List<ChurnDTO> selectAll() throws Exception;

	public int upsertChurnFeatures(ChurnDTO churnDTO) throws Exception;

	public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception;

}

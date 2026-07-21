package com.health.app.gym;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface GymMapper {

	public List<GymDTO> selectId()throws Exception;

}

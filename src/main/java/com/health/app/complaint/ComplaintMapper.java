package com.health.app.complaint;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ComplaintMapper {

	public int create(ComplaintDTO complaintDTO) throws Exception;

	public List<ComplaintDTO> memberList(Long username) throws Exception;

	public List<ComplaintDTO> ownerList(Long gymId) throws Exception;

	public int update(ComplaintDTO complaintDTO) throws Exception;

	public ComplaintDTO getComplaintById(Long gymId) throws Exception;

}

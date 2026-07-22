package com.health.app.member;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

	public int join(MemberDTO memberDTO) throws Exception;

	
	public MemberDTO idcheck(MemberDTO memberDTO) throws Exception;

	
	public MemberDTO idCheck(MemberDTO memberDTO) throws Exception;

	public int update(MemberDTO memberDTO) throws Exception;

	public List<MemberDTO> findByRole(@Param("role") String role) throws Exception;

	public MemberDTO findOwnerByGymId(@Param("gymId") Long gymId) throws Exception;

	public List<MemberDTO> findMembersByGymId(@Param("gymId") Long gymId) throws Exception;

	public int updateToken(RefreshTokenDTO refreshTokenDTO) throws Exception;

	public RefreshTokenDTO getRefreshToken(String refreshToken) throws Exception;

	public int deleteToken(@Param("username") Long username) throws Exception;

}
package com.health.app.member;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MemberMapper {

	public int join(MemberDTO memberDTO) throws Exception;

	public MemberDTO idcheck(MemberDTO memberDTO) throws Exception;

	public int update(MemberDTO memberDTO) throws Exception;

	public List<MemberDTO> findByRole(String role) throws Exception;

	public MemberDTO findOwnerByGymId(Long gymId) throws Exception;

	public List<MemberDTO> findMembersByGymId(Long gymId) throws Exception;

	public int updateToken(RefreshTokenDTO refreshTokenDTO) throws Exception;

	public RefreshTokenDTO getRefreshToken(String refreshToken) throws Exception;

	public int deleteToken(Long username) throws Exception;

}
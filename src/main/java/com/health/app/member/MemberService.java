package com.health.app.member;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.health.app.config.JwtUtill;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberService {

	private final MemberMapper memberMapper;
	private final BCryptPasswordEncoder passwordEncoder;
	private final JwtUtill jwtUtill;

	public List<MemberDTO> findByRole(String role) throws Exception {
		return memberMapper.findByRole(role);
	}

	public MemberDTO findOwnerByGymId(Long gymId) throws Exception {
		return memberMapper.findOwnerByGymId(gymId);
	}

	public List<MemberDTO> findMembersByGymId(Long gymId) throws Exception {
		return memberMapper.findMembersByGymId(gymId);
	}

	public int update(MemberDTO memberDTO) throws Exception {
		if (memberDTO.getPassword() == null || memberDTO.getPassword().trim().isEmpty()) {
			return -1;
		}

		if (!memberDTO.getPassword().equals(memberDTO.getPasswordCheck())) {
			return -2;
		}

		String hashedPassword = passwordEncoder.encode(memberDTO.getPassword());
		memberDTO.setPassword(hashedPassword);

		return memberMapper.update(memberDTO);
	}

	private Long formatUsernameToEightDigits(Long username) {
		if (username == null) {
			return null;
		}

		String phoneStr = String.valueOf(username);

		if (phoneStr.length() > 8) {
			phoneStr = phoneStr.substring(phoneStr.length() - 8);
		}
		return Long.parseLong(phoneStr);
	}

	public int join(MemberDTO memberDTO) throws Exception {
		if (memberDTO.getPassword() == null || !memberDTO.getPassword().equals(memberDTO.getPasswordCheck())) {
			return -1;
		}

		String hashedPassword = passwordEncoder.encode(memberDTO.getPassword());
		memberDTO.setPassword(hashedPassword);

		Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());
		memberDTO.setUsername(formattedUsername);

		if (this.idcheck(memberDTO) != null) {
			return -2;
		}

		return memberMapper.join(memberDTO);
	}

	public MemberDTO idcheck(MemberDTO memberDTO) throws Exception {
		Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());
		memberDTO.setUsername(formattedUsername);
		return memberMapper.idcheck(memberDTO);
	}

	public MemberDTO login(MemberDTO memberDTO) throws Exception {
		Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());

		MemberDTO queryDTO = new MemberDTO();
		queryDTO.setUsername(formattedUsername);

		MemberDTO existMember = memberMapper.idcheck(queryDTO);
		if (existMember == null) {
			return null;
		}

		if (!passwordEncoder.matches(memberDTO.getPassword(), existMember.getPassword())) {
			return null;
		}

		existMember.setPassword(null);
		return existMember;
	}

	public Map<String, String> generatedLoginTokens(MemberDTO member) throws Exception {
		String accessToken = jwtUtill.generateToken(member.getUsername().toString(), member.getRole());
		String refreshToken = jwtUtill.generateToken(member.getUsername().toString());

		RefreshTokenDTO tokenDTO = new RefreshTokenDTO();
		tokenDTO.setUsername(member.getUsername());
		tokenDTO.setRefreshToken(refreshToken);
		tokenDTO.setExpiryDate(jwtUtill.getExpiryDateTime());

		memberMapper.updateToken(tokenDTO);

		Map<String, String> tokenMap = new HashMap<>();
		tokenMap.put("accessToken", accessToken);
		tokenMap.put("refreshToken", refreshToken);

		return tokenMap;
	}

	public String refreshAccessToken(String refreshToken) throws Exception {
		if (!jwtUtill.isRefreshTokenValid(refreshToken)) {
			throw new IllegalArgumentException("유효하지 않거나 만료된 리프레쉬 토큰입니다.");
		}

		RefreshTokenDTO dbToken = memberMapper.getRefreshToken(refreshToken);
		if (dbToken == null) {
			throw new IllegalArgumentException("존재하지 않거나 만료된 로그인 세션 토큰입니다. 다시 로그인해 주세요.");
		}

		if (dbToken.getExpiryDate().isBefore(LocalDateTime.now())) {
			throw new IllegalArgumentException("만료된 로그인 세션입니다. 다시 로그인해 주세요.");
		}

		MemberDTO query = new MemberDTO();
		query.setUsername(dbToken.getUsername());
		MemberDTO member = memberMapper.idcheck(query);

		String role = member != null ? member.getRole() : "MEMBER";

		return jwtUtill.generateToken(dbToken.getUsername().toString(), role);
	}

	public int deleteToken(Long username) throws Exception {
		Long formattedUsername = this.formatUsernameToEightDigits(username);
		return memberMapper.deleteToken(formattedUsername);
	}

}
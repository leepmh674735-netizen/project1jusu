package com.health.app.contract;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/contract")
public class ContractController {

    @Autowired
    private ContractService contractService;

    @Autowired
    private JwtUtill jwtUtill;

    private Claims extractClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> contractUserList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long contract,
            @RequestParam(required = false) String keyword) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));
        contractDTO.setContract(contract);
        contractDTO.setKeyword(keyword);

        List<ContractDTO> userList = contractService.contractUserList(contractDTO);

        if (userList == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(userList);
    }

    @GetMapping("/trial-targets")
    public ResponseEntity<?> trialTargetList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        List<TrialTargetDTO> targets = contractService.trialTargetList(contractDTO);

        if (targets == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(targets);
    }

    @GetMapping("/owners")
    public ResponseEntity<?> ownerList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<MemberDTO> owners = contractService.ownerList(claims.get("role", String.class));

        if (owners == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(owners);
    }

    @GetMapping("/roster")
    public ResponseEntity<?> contractRoster(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long gymId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));
        contractDTO.setGymId(gymId);

        List<ContractDTO> roster = contractService.contractRoster(contractDTO);
        if (roster == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(roster);
    }

    @GetMapping("/jobseekers")
    public ResponseEntity<?> jobSeekingTrainers(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<MemberDTO> trainers = contractService.jobSeekingTrainers(claims.get("role", String.class));
        if (trainers == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(trainers);
    }

    @PostMapping("/insert")
    public ResponseEntity<String> contractInsert(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ContractDTO contractDTO) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        contractDTO.setSenderId(claims.getSubject());
        contractDTO.setRole(claims.get("role", String.class));

        int result = contractService.contractInsert(contractDTO);

        if (result == -1) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("해당 계약서를 발행할 권한이 없습니다.");
        } else if (result == -2) {
            return ResponseEntity.badRequest().body("수신자 정보를 입력해 주세요.");
        } else if (result == -6) {
            return ResponseEntity.badRequest().body("총 PT 횟수는 0 이상이어야 합니다.");
        } else if (result == -7) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 유효한 PT 체험 계약이 있어 중복 발행할 수 없습니다.");
        } else if (result == -8) {
            return ResponseEntity.badRequest().body("체험권 정보가 없거나 발행 가능한 체험권이 아닙니다.");
        } else if (result > 0) {
            return ResponseEntity.ok(String.valueOf(contractDTO.getDataId()));
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    @GetMapping("/detail/{dataId}")
    public ResponseEntity<?> contractDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setDataId(dataId);
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        ContractDTO detail = contractService.contractDetail(contractDTO);
        if (detail == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("계약서가 없거나 열람 권한이 없습니다.");
        }
        return ResponseEntity.ok(detail);
    }

    @PutMapping("/detail/{dataId}/sign")
    public ResponseEntity<String> contractSign(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setDataId(dataId);
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        int result = contractService.contractSign(contractDTO);

        if (result == -1) {
            return ResponseEntity.badRequest().body("존재하지 않는 계약서입니다.");
        } else if (result == -2) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("서명 권한이 없습니다.");
        } else if (result == -3 || result == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("서명할 수 없는 상태의 계약서입니다.");
        } else {
            return ResponseEntity.ok("Success");
        }
    }
}
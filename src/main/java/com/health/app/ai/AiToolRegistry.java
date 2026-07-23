package com.health.app.ai;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.health.app.complaint.ComplaintService;
import com.health.app.contract.ContractDTO;
import com.health.app.contract.ContractService;
import com.health.app.dashboard.DashboardService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;
import com.health.app.pager.Pager;
import com.health.app.payment.PaymentService;
import com.health.app.settle.SettleService;
import com.health.app.survey.SurveyService;

import jakarta.annotation.PostConstruct;

@Component
public class AiToolRegistry {

	public interface ToolExecutor {
		Object execute(AuthContext ctx, Map<String, Object> args) throws Exception;
	}

	public static class ToolSpec {
		private final String name;
		private final String description;
		private final Map<String, Object> properties;
		private final List<String> required;
		private final Set<String> allowedRoles;
		private final String classification;
		private final String linkTo;
		private final String linkLabel;
		private final String chartType;
		private final ToolExecutor executor;

		public ToolSpec(String name, String description, Map<String, Object> properties,
				List<String> required, Set<String> allowedRoles, String classification,
				String linkTo, String linkLabel, ToolExecutor executor) {
			this(name, description, properties, required, allowedRoles, classification,
					linkTo, linkLabel, null, executor);
		}

		public ToolSpec(String name, String description, Map<String, Object> properties,
				List<String> required, Set<String> allowedRoles, String classification,
				String linkTo, String linkLabel, String chartType, ToolExecutor executor) {
			this.name = name;
			this.description = description;
			this.properties = properties;
			this.required = required;
			this.allowedRoles = allowedRoles;
			this.classification = classification;
			this.linkTo = linkTo;
			this.linkLabel = linkLabel;
			this.chartType = chartType;
			this.executor = executor;
		}

		public String getName() { return name; }
		public String getDescription() { return description; }
		public Map<String, Object> getProperties() { return properties; }
		public List<String> getRequired() { return required; }
		public Set<String> getAllowedRoles() { return allowedRoles; }
		public String getClassification() { return classification; }
		public String getLinkTo() { return linkTo; }
		public String getLinkLabel() { return linkLabel; }
		public String getChartType() { return chartType; }
		public ToolExecutor getExecutor() { return executor; }
	}

	@Autowired
	private ContractService contractService;

	@Autowired
	private DashboardService dashboardService;

	@Autowired
	private SettleService settleService;

	@Autowired
	private PaymentService paymentService;

	@Autowired
	private ComplaintService complaintService;

	@Autowired
	private SurveyService surveyService;

	@Autowired
	private MemberMapper memberMapper;

	@Autowired
	private AiMapper aiMapper;

	@Autowired
	private AiBriefingService aiBriefingService;

	private final Map<String, ToolSpec> tools = new LinkedHashMap<>();

	private static Map<String, Object> prop(String type, String description) {
		Map<String, Object> map = new LinkedHashMap<>();
		map.put("type", type);
		map.put("description", description);
		return map;
	}

	private Long resolveSameGymMember(AuthContext ctx, Map<String, Object> args) throws Exception {
		Object raw = args.get("memberUsername");
		if (raw == null) {
			return null;
		}
		Long target = Long.parseLong(String.valueOf(raw).replaceAll("[^0-9]", ""));
		MemberDTO find = new MemberDTO();
		find.setUsername(target);
		MemberDTO member = memberMapper.idcheck(find);
		if (member == null || member.getGymId() == null || !member.getGymId().equals(ctx.getGymId())) {
			return null;
		}
		return target;
	}

	private Pager buildPager(Map<String, Object> args) {
		Pager pager = new Pager();
		pager.setCurrentPage(1L);
		pager.setPageSize(20L);
		Object month = args.get("month");
		if (month != null && !String.valueOf(month).isBlank()) {
			pager.setMonth(String.valueOf(month));
		}
		Object keyword = args.get("keyword");
		if (keyword != null && !String.valueOf(keyword).isBlank()) {
			pager.setSearchKeyword(String.valueOf(keyword));
		}
		return pager;
	}

	@PostConstruct
	public void init() {

		register(new ToolSpec(
				"list_contracts",
				"로그인 사장님이 발행/수신한 계약서 리스트를 조회한다. 계약 유형: 1=제휴, 2=임금, 3=이용권, 4=PT, 5=PT 체험. contract 파라미터로 유형 필터 가능.",
				Map.of("contract", prop("integer", "계약 유형 필터 (1~5, 생략 시 전체)")),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/contractpage", "계약서 리스트로 이동",
				(ctx, args) -> {
					ContractDTO dto = new ContractDTO();
					dto.setUsername(ctx.getUsername());
					dto.setRole(ctx.getRole());
					Object contract = args.get("contract");
					if (contract != null) {
						dto.setContract(Long.parseLong(String.valueOf(contract)));
					}
					return contractService.contractUserList(dto);
				}));

		register(new ToolSpec(
				"get_contract_detail",
				"계약서 1건의 상세 내용을 조회한다. 당사자 검증은 서버가 수행한다.",
				Map.of("dataId", prop("integer", "계약서 번호(dataId)")),
				List.of("dataId"),
				Set.of("OWNER"), "READ",
				"/fitb/contractpage", "계약서 리스트로 이동",
				(ctx, args) -> {
					ContractDTO dto = new ContractDTO();
					dto.setDataId(Long.parseLong(String.valueOf(args.get("dataId"))));
					dto.setUsername(ctx.getUsername());
					dto.setRole(ctx.getRole());
					Object detail = contractService.contractDetail(dto);
					return detail != null ? detail : Map.of("message", "계약서가 없거나 열람 권한이 없습니다.");
				}));

		register(new ToolSpec(
				"list_roster",
				"우리 지점 소속 트레이너·회원 명단과 각자의 최신 계약 기간을 조회한다.",
				Map.of(),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/contractpage/member", "회원 명단으로 이동",
				(ctx, args) -> {
					ContractDTO dto = new ContractDTO();
					dto.setUsername(ctx.getUsername());
					dto.setRole(ctx.getRole());
					return contractService.contractRoster(dto);
				}));

		register(new ToolSpec(
				"get_dashboard_summary",
				"대시보드 위젯 집계(회원 수, 만료 임박 계약, 월별 매출/지출, 이탈율 등)를 한 번에 조회한다.",
				Map.of(),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/dashboard", "대시보드로 이동",
				(ctx, args) -> dashboardService.widgetData(ctx.getUsername(), ctx.getRole(), ctx.getGymId())));

		register(new ToolSpec(
				"list_expenses",
				"우리 지점의 지출 내역을 조회한다(최근 20건). month로 조회월, keyword로 검색어 필터 가능. 금액은 원 단위.",
				Map.of(
						"month", prop("string", "조회월 (YYYY-MM, 생략 가능)"),
						"keyword", prop("string", "검색어 (생략 가능)")),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/Settlepage", "매출·지출 페이지로 이동", "bar",
				(ctx, args) -> settleService.expenseList(ctx.getUsername(), ctx.getRole(), buildPager(args), null)));

		register(new ToolSpec(
				"list_payments",
				"우리 지점의 매출(결제) 내역을 조회한다(최근 20건). month로 조회월, keyword로 검색어 필터 가능. 금액은 원 단위.",
				Map.of(
						"month", prop("string", "조회월 (YYYY-MM, 생략 가능)"),
						"keyword", prop("string", "검색어 (생략 가능)")),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/Settlepage", "매출·지출 페이지로 이동", "bar",
				(ctx, args) -> paymentService.paymentList(ctx.getUsername(), buildPager(args), null)));

		register(new ToolSpec(
				"list_complaints",
				"우리 지점에 접수된 회원 건의글 목록을 조회한다.",
				Map.of(),
				List.of(),
				Set.of("OWNER"), "READ",
				"/fitb/b2bmypage/b2bcomplaint", "건의글 페이지로 이동",
				(ctx, args) -> complaintService.ownerList(ctx.getGymId())));

		register(new ToolSpec(
				"get_member_survey",
				"우리 지점 회원 1명의 최신 설문(NPS 등) 응답을 조회한다. memberUsername은 회원 아이디(전화 뒤 8자리).",
				Map.of("memberUsername", prop("integer", "대상 회원 아이디(전화 뒤 8자리)")),
				List.of("memberUsername"),
				Set.of("OWNER"), "READ",
				null, null,
				(ctx, args) -> {
					Long target = resolveSameGymMember(ctx, args);
					if (target == null) {
						return Map.of("message", "해당 회원을 찾을 수 없습니다.");
					}
					Object survey = surveyService.selectByUsername(target);
					return survey != null ? survey : Map.of("message", "설문 응답이 없습니다.");
				}));

		register(new ToolSpec(
				"get_churn_prediction",
				"우리 지점 회원 1명의 최신 이탈 예측 결과(이탈 확률·주요 이탈 요인)를 조회한다. memberUsername은 회원 아이디(전화 뒤 8자리).",
				Map.of("memberUsername", prop("integer", "대상 회원 아이디(전화 뒤 8자리)")),
				List.of("memberUsername"),
				Set.of("OWNER"), "READ",
				"/fitb/dashboard", "대시보드로 이동", "gauge",
				(ctx, args) -> {
					Long target = resolveSameGymMember(ctx, args);
					if (target == null) {
						return Map.of("message", "해당 회원을 찾을 수 없습니다.");
					}
					Object result = aiMapper.latestChurnResult(target);
					return result != null ? result : Map.of("message", "이탈 예측 결과가 없습니다.");
				}));

		register(new ToolSpec(
				"get_task_briefing",
				"사장님이 오늘 처리해야 할 일(이탈 예방·계약 만료 임박·미결제·지출 정산·미처리 건의) 후보 전체를 건수와 함께 조회한다.",
				Map.of(),
				List.of(),
				Set.of("OWNER"), "READ",
				null, null, "list",
				(ctx, args) -> aiBriefingService.briefing(ctx, true)));
	}

	private void register(ToolSpec spec) {
		tools.put(spec.getName(), spec);
	}

	public ToolSpec find(String name) {
		return tools.get(name);
	}

	public List<ToolSpec> toolsForRole(String role) {
		return tools.values().stream()
				.filter(spec -> spec.getAllowedRoles().contains(role))
				.toList();
	}
}
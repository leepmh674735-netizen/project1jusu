package com.health.app.dashboard;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

	@Autowired
	private DashboardMapper dashboardMapper;

	private static final Map<String, List<String>> DEFAULT_WIDGETS = Map.of(
			"ADMIN", List.of("gymCount", "expiringSubscription", "monthlyRevenue", "monthlyExpense", "gymNps"),
			"OWNER", List.of("memberCount", "expiringContract", "monthlyRevenue", "monthlyExpense", "bodyComposition", "gymChurn"),
			"TRAINER", List.of("managedMemberCount", "lowSessionMembers", "monthlySession", "memberChurn", "goalRate")
	);

	public Long memberGymId(Long username) throws Exception {
		return dashboardMapper.memberGymId(username);
	}

	@Transactional
	public List<DashboardDTO> widgetList(Long username, String role, Long gymId) throws Exception {

		List<String> defaults = DEFAULT_WIDGETS.get(role);
		if (defaults == null) {
			return List.of();
		}

		gymId = isolatedGymId(role, gymId);

		List<DashboardDTO> existing = dashboardMapper.widgetList(username);
		boolean firstInit = existing.isEmpty();
		Set<String> existingKeys = new HashSet<>();
		long maxOrder = 0;
		for (DashboardDTO widget : existing) {
			existingKeys.add(widget.getWidgetKey());
			maxOrder = Math.max(maxOrder, widget.getSortOrder() == null ? 0 : widget.getSortOrder());
		}
		Set<String> addedKeys = new HashSet<>();
		for (String widgetKey : defaults) {
			if (existingKeys.contains(widgetKey)) {
				continue;
			}
			DashboardDTO widget = new DashboardDTO();
			widget.setUsername(username);
			widget.setGymId(gymId);
			widget.setRole(role);
			widget.setWidgetKey(widgetKey);
			widget.setIsActive(false);
			widget.setHasData(false);
			widget.setSortOrder(++maxOrder);
			dashboardMapper.widgetAdd(widget);
			addedKeys.add(widgetKey);
		}

		List<DashboardDTO> widgets = dashboardMapper.widgetList(username);
		for (DashboardDTO widget : widgets) {
			boolean hasData = checkHasData(widget.getWidgetKey(), role, gymId, username);
			boolean active = hasData && (firstInit || addedKeys.contains(widget.getWidgetKey())
					|| Boolean.TRUE.equals(widget.getIsActive()));
			if (widget.getHasData() == null || widget.getHasData() != hasData
					|| Boolean.TRUE.equals(widget.getIsActive()) != active) {
				widget.setHasData(hasData);
				widget.setIsActive(active);
				dashboardMapper.widgetHasDataUpdate(widget);
			}
		}
		return widgets;
	}

	public int widgetToggle(Long username, String widgetKey, Boolean isActive) throws Exception {

		DashboardDTO widget = new DashboardDTO();
		widget.setUsername(username);
		widget.setWidgetKey(widgetKey);
		widget.setIsActive(isActive);
		return dashboardMapper.widgetToggle(widget);
	}

	public int widgetOrderUpdate(Long username, List<DashboardDTO> widgets) throws Exception {

		int updated = 0;
		for (DashboardDTO widget : widgets) {
			if (widget.getWidgetKey() == null || widget.getSortOrder() == null) {
				continue;
			}
			widget.setUsername(username);
			updated += dashboardMapper.widgetOrderUpdate(widget);
		}
		return updated;
	}

	public Map<String, Object> widgetData(Long username, String role, Long gymId) throws Exception {

		gymId = isolatedGymId(role, gymId);

		Map<String, Object> data = new LinkedHashMap<>();
		for (DashboardDTO widget : widgetList(username, role, gymId)) {
			if (Boolean.TRUE.equals(widget.getIsActive()) && Boolean.TRUE.equals(widget.getHasData())) {
				data.put(widget.getWidgetKey(), loadWidgetData(widget.getWidgetKey(), role, gymId, username));
			}
		}
		return data;
	}

	private boolean checkHasData(String widgetKey, String role, Long gymId, Long username) throws Exception {

		switch (widgetKey) {
			case "gymCount":
			case "expiringSubscription":
				return countOf(dashboardMapper.adminGymCount()) > 0;
			case "monthlyRevenue":
				return !dashboardMapper.monthlyRevenue(monthlyScope(role, gymId)).isEmpty();
			case "monthlyExpense":
				return !dashboardMapper.monthlyExpense(monthlyScope(role, gymId)).isEmpty();
			case "gymNps":
				return countOf(dashboardMapper.adminNpsSummary()) > 0;
			case "memberCount":
			case "expiringContract":
				return countOf(dashboardMapper.ownerMemberCount(gymId)) > 0;
			case "bodyComposition":
				return countOf(dashboardMapper.ownerModelSummary(gymId)) > 0;
			case "gymChurn":
				return countOf(dashboardMapper.ownerChurnSummary(gymId)) > 0;
			case "managedMemberCount":
			case "lowSessionMembers":
				return countOf(dashboardMapper.trainerMemberCount(username)) > 0;
			case "monthlySession":
				return !dashboardMapper.trainerMonthlySession(username).isEmpty();
			case "memberChurn":
				return countOf(dashboardMapper.trainerChurnSummary(username)) > 0;
			default:
				return false;
		}
	}

	private Object loadWidgetData(String widgetKey, String role, Long gymId, Long username) throws Exception {

		switch (widgetKey) {
			case "gymCount":
				return dashboardMapper.adminGymCount();
			case "expiringSubscription":
				return dashboardMapper.adminExpiringSubscription();
			case "monthlyRevenue":
				return dashboardMapper.monthlyRevenue(monthlyScope(role, gymId));
			case "monthlyExpense":
				return dashboardMapper.monthlyExpense(monthlyScope(role, gymId));
			case "gymNps":
				return dashboardMapper.adminNpsSummary();
			case "memberCount":
				return dashboardMapper.ownerMemberCount(gymId);
			case "expiringContract":
				return dashboardMapper.ownerExpiringContract(gymId);
			case "bodyComposition":
				return dashboardMapper.ownerModelSummary(gymId);
			case "gymChurn":
				return dashboardMapper.ownerChurnSummary(gymId);
			case "managedMemberCount":
				return dashboardMapper.trainerMemberCount(username);
			case "lowSessionMembers":
				return dashboardMapper.trainerLowSessionMembers(username);
			case "monthlySession":
				return dashboardMapper.trainerMonthlySession(username);
			case "memberChurn":
				return dashboardMapper.trainerChurnSummary(username);
			default:
				return null;
		}
	}

	private Long isolatedGymId(String role, Long gymId) {

		if ("OWNER".equals(role) && gymId == null) {
			return -1L;
		}
		return gymId;
	}

	private DashboardDTO monthlyScope(String role, Long gymId) {

		DashboardDTO scope = new DashboardDTO();
		if ("OWNER".equals(role)) {
			scope.setGymId(gymId);
		}
		return scope;
	}

	private long countOf(Map<String, Object> summary) {

		if (summary == null || summary.get("total") == null) {
			return 0;
		}
		return ((Number) summary.get("total")).longValue();
	}

}
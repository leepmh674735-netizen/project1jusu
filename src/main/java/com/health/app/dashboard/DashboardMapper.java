package com.health.app.dashboard;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DashboardMapper {

    public List<DashboardDTO> widgetList(Long username) throws Exception;

    public int widgetAdd(DashboardDTO dashboardDTO) throws Exception;

    public int widgetToggle(DashboardDTO dashboardDTO) throws Exception;

    public int widgetOrderUpdate(DashboardDTO dashboardDTO) throws Exception;

    public int widgetHasDataUpdate(DashboardDTO dashboardDTO) throws Exception;

    public Long memberGymId(Long username) throws Exception;

    public Map<String, Object> adminGymCount() throws Exception;

    public List<Map<String, Object>> adminExpiringSubscription() throws Exception;

    public Map<String, Object> adminNpsSummary() throws Exception;

    public List<Map<String, Object>> monthlyRevenue(DashboardDTO dashboardDTO) throws Exception;

    public List<Map<String, Object>> monthlyExpense(DashboardDTO dashboardDTO) throws Exception;

    public Map<String, Object> ownerMemberCount(Long gymId) throws Exception;

    public List<Map<String, Object>> ownerExpiringContract(Long gymId) throws Exception;

    public Map<String, Object> ownerModelSummary(Long gymId) throws Exception;

    public Map<String, Object> ownerChurnSummary(Long gymId) throws Exception;

    public Map<String, Object> trainerMemberCount(Long username) throws Exception;

    public List<Map<String, Object>> trainerLowSessionMembers(Long username) throws Exception;

    public List<Map<String, Object>> trainerMonthlySession(Long username) throws Exception;

    public Map<String, Object> trainerChurnSummary(Long username) throws Exception;

}
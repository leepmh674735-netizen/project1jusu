package com.health.app.helper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface HelperMapper {

    List<Map<String, Object>> selectTrainers(@Param("gymId") Long gymId) throws Exception;

    List<Map<String, Object>> selectComplaintVisitSlots(@Param("gymId") Long gymId,
                                                         @Param("mode") String mode,
                                                         @Param("period") String period,
                                                         @Param("statKey") String statKey) throws Exception;

    List<Map<String, Object>> selectComplaintManagers(@Param("gymId") Long gymId,
                                                      @Param("mode") String mode,
                                                      @Param("period") String period,
                                                      @Param("statKey") String statKey) throws Exception;

    List<Map<String, Object>> selectServiceCenters() throws Exception;

    int insertHelperRequest(@Param("username") Long username, @Param("contents") String contents) throws Exception;
}
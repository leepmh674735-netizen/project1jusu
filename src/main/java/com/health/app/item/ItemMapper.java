package com.health.app.item;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.pager.Pager;

@Mapper
public interface ItemMapper {

	public Long getOwnerGymId(@Param("username") Long username) throws Exception;

	public Long getGymIdForGymUser(@Param("username") Long username) throws Exception;

	public int itemAdd(ItemDTO itemDTO) throws Exception;

	public List<ItemDTO> itemList(@Param("gymId") Long gymId, @Param("pager") Pager pager, @Param("sort") String sort,
			@Param("category") String category) throws Exception;

	public long itemListCount(@Param("gymId") Long gymId, @Param("pager") Pager pager,
			@Param("category") String category) throws Exception;

	public List<ItemDTO> itemNames(Long gymId) throws Exception;

	public List<ItemDTO> itemListAll(@Param("gymId") Long gymId, @Param("keyword") String keyword,
			@Param("category") String category) throws Exception;

	public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception;

	public int itemUpdate(ItemDTO itemDTO) throws Exception;

	public int itemDelete(ItemDTO itemDTO) throws Exception;

	public List<ItemDTO> findExpiringItems() throws Exception;

	public List<ItemDTO> selectByCategory(@Param("gymId") Long gymId, @Param("category") String category)
			throws Exception;

}
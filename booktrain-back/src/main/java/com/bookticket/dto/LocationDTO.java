package com.bookticket.dto;

import com.bookticket.entity.Location;
import lombok.Data;

@Data
public class LocationDTO {
    private Integer id;
    private String name;
    private String locationType;
    private String provinceName;
    private Integer provinceId;
    private String address;
    private String iataCode;

    // Convert từ entity sang DTO
    public static LocationDTO from(Location loc) {
        LocationDTO dto = new LocationDTO();
        dto.setId(loc.getId());
        dto.setName(loc.getName());
        dto.setLocationType(loc.getLocationType());
        dto.setAddress(loc.getAddress());
        dto.setIataCode(loc.getIataCode());
        if (loc.getProvince() != null) {
            dto.setProvinceName(loc.getProvince().getName()); //lấy tên tỉnh
            dto.setProvinceId(loc.getProvince().getId());
        }
        return dto;
    }
}
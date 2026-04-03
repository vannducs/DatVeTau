package com.booktrain.dto;

import lombok.*;
import com.booktrain.entity.Province;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationDTO {
    private Integer id;
    private String name;
    private String locationType;
    private String provinceName;
    private String provinceId;
    private String address;
    private String iataCode;

    public static LocationDTO fromEntity(com.booktrain.entity.Location loc) {
        Province prov = loc.getProvince();
        return LocationDTO.builder()
                .id(loc.getId())
                .name(loc.getName())
                .locationType(loc.getLocationType())
                .provinceName(prov != null ? prov.getName() : null)
                .provinceId(prov != null ? String.valueOf(prov.getId()) : null)
                .address(loc.getAddress())
                .iataCode(loc.getIataCode())
                .build();
    }
}

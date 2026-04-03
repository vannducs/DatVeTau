package com.booktrain.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvinceDTO {
    private Integer id;
    private String name;
    private String regionCode;
}

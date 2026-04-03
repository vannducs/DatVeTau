package com.booktrain.service;

import com.booktrain.dto.*;
import com.booktrain.entity.Location;
import com.booktrain.entity.Province;
import com.booktrain.repository.LocationRepository;
import com.booktrain.repository.ProvinceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {
    private final LocationRepository locationRepository;
    private final ProvinceRepository provinceRepository;

    public List<LocationDTO> getAllTrainStations() {
        return locationRepository.findAllTrainStations().stream()
                .map(LocationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<LocationDTO> getAllAirports() {
        return locationRepository.findAllAirports().stream()
                .map(LocationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<LocationDTO> getAllBusStations() {
        return locationRepository.findAllBusStations().stream()
                .map(LocationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<ProvinceDTO> getAllProvinces() {
        return provinceRepository.findAllByOrderByNameAsc().stream()
                .map(p -> ProvinceDTO.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .regionCode(p.getRegionCode())
                        .build())
                .collect(Collectors.toList());
    }
}

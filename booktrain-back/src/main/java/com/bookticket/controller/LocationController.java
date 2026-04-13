package com.bookticket.controller;

import com.bookticket.dto.LocationDTO;
import com.bookticket.entity.Location;
import com.bookticket.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;

    // GET /api/locations/train-stations
    // GET /api/locations/train-stations?q=hà nội
    @GetMapping("/train-stations")
    public List<LocationDTO> getTrainStations(
            @RequestParam(required = false) String q) {

        List<Location> locations;

        if (q != null && !q.isBlank()) {
            locations = locationRepository
                    .findByLocationTypeAndNameContainingIgnoreCase("train_station", q);
        } else {
            locations = locationRepository.findByLocationType("train_station");
        }

        // Convert sang DTO để có provinceName
        return locations.stream()
                .map(LocationDTO::from)
                .collect(java.util.stream.Collectors.toList());
    }
}
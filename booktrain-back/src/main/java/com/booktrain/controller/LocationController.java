package com.booktrain.controller;

import com.booktrain.dto.*;
import com.booktrain.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LocationController {
    private final LocationService locationService;

    @GetMapping("/train-stations")
    public ResponseEntity<List<LocationDTO>> getTrainStations() {
        return ResponseEntity.ok(locationService.getAllTrainStations());
    }

    @GetMapping("/airports")
    public ResponseEntity<List<LocationDTO>> getAirports() {
        return ResponseEntity.ok(locationService.getAllAirports());
    }

    @GetMapping("/bus-stations")
    public ResponseEntity<List<LocationDTO>> getBusStations() {
        return ResponseEntity.ok(locationService.getAllBusStations());
    }

    @GetMapping("/provinces")
    public ResponseEntity<List<ProvinceDTO>> getProvinces() {
        return ResponseEntity.ok(locationService.getAllProvinces());
    }
}

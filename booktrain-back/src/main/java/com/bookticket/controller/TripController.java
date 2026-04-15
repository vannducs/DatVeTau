package com.bookticket.controller;

import com.bookticket.dto.TripResultDTO;
import com.bookticket.entity.TrainSeat;
import com.bookticket.entity.TrainTrip;
import com.bookticket.repository.TrainSeatRepository;
import com.bookticket.repository.TrainTripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.bookticket.dto.SeatDTO;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TrainTripRepository tripRepository;
    private final TrainSeatRepository seatRepository;

    @GetMapping("/search")
    public List<TripResultDTO> searchTrips(
            @RequestParam Integer originId,
            @RequestParam Integer destinationId,
            @RequestParam String date) {

        LocalDate departureDate = LocalDate.parse(date);
        List<TrainTrip> trips = tripRepository.findTrips(originId, destinationId, departureDate);

        return trips.stream().map(trip -> {
            TripResultDTO dto = TripResultDTO.from(trip);

            // Lấy giá và số chỗ trống theo loại toa
            List<TrainSeat> seats = seatRepository.findAvailableByTripId(trip.getId());

            // Group theo loại toa
            Map<String, List<TrainSeat>> grouped = seats.stream()
                    .collect(Collectors.groupingBy(s -> s.getCarriage().getCarriageType()));

            List<TripResultDTO.CarriagePriceDTO> prices = new ArrayList<>();
            grouped.forEach((type, seatList) -> {
                TripResultDTO.CarriagePriceDTO cp = new TripResultDTO.CarriagePriceDTO();
                cp.setCarriageType(type);
                cp.setCarriageTypeLabel(getCarriageLabel(type));
                cp.setMinPrice(seatList.stream()
                        .mapToLong(s -> s.getTicketPrice().longValue())
                        .min().orElse(0));
                cp.setAvailableSeats(seatList.size());
                prices.add(cp);
            });

            // Sắp xếp theo giá
            prices.sort(Comparator.comparingLong(TripResultDTO.CarriagePriceDTO::getMinPrice));
            dto.setCarriagePrices(prices);
            return dto;
        }).collect(Collectors.toList());
    }

    private String getCarriageLabel(String type) {
        return switch (type) {
            case "hard_seat"      -> "Ngồi cứng";
            case "soft_seat"      -> "Ngồi mềm";
            case "hard_sleeper"   -> "Giường khoang 6";
            case "soft_sleeper"   -> "Giường khoang 4";
            case "vip_ac_sleeper" -> "Giường VIP";
            default -> type;
        };
    }
    @GetMapping("/{tripId}/seats")
    public ResponseEntity<?> getSeatsByTrip(@PathVariable Integer tripId) {

        // Kiểm tra trip có tồn tại không
        if (!tripRepository.existsById(tripId)) {
            return ResponseEntity.notFound().build();
        }

        // Lấy tất cả ghế của chuyến (cả available lẫn booked)
        List<TrainSeat> seats = seatRepository.findAllByTripId(tripId);

        // Group theo toa
        Map<Integer, List<SeatDTO>> groupedByCarriage = seats.stream()
                .map(SeatDTO::from)
                .collect(Collectors.groupingBy(SeatDTO::getCarriageNumber));

        return ResponseEntity.ok(groupedByCarriage);
    }
    @GetMapping("/{tripId}")
    public ResponseEntity<?> getTripById(@PathVariable Integer tripId) {
        return tripRepository.findById(tripId)
                .map(trip -> {
                    TripResultDTO dto = TripResultDTO.from(trip);
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
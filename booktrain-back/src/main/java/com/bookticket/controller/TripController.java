package com.bookticket.controller;

import com.bookticket.dto.SeatDTO;
import com.bookticket.dto.TripResultDTO;
import com.bookticket.entity.TrainRoute;
import com.bookticket.entity.TrainSeat;
import com.bookticket.entity.TrainTrip;
import com.bookticket.repository.SeatBookingRepository;
import com.bookticket.repository.TrainRouteRepository;
import com.bookticket.repository.TrainSeatRepository;
import com.bookticket.repository.TrainTripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TrainTripRepository    tripRepository;
    private final TrainSeatRepository    seatRepository;
    private final TrainRouteRepository   routeRepository;
    private final SeatBookingRepository  bookingRepository;

    /* ── GET /api/trips/search ── */
    @GetMapping("/search")
    public List<TripResultDTO> searchTrips(
            @RequestParam Integer originId,
            @RequestParam Integer destinationId,
            @RequestParam String  date) {

        LocalDate departureDate = LocalDate.parse(date);

        List<Integer> trainIds = routeRepository.findTrainIdsThroughBothStations(originId, destinationId);
        if (trainIds.isEmpty()) return List.of();

        List<TrainTrip> trips = tripRepository.findByTrainIdsAndDate(trainIds, departureDate);

        List<TripResultDTO> results = new ArrayList<>();
        for (TrainTrip trip : trips) {
            Integer trainId = trip.getTrain().getId();

            Optional<TrainRoute> boardOpt  = routeRepository.findByTrainIdAndLocationId(trainId, originId);
            Optional<TrainRoute> alightOpt = routeRepository.findByTrainIdAndLocationId(trainId, destinationId);
            if (boardOpt.isEmpty() || alightOpt.isEmpty()) continue;

            TrainRoute boardRoute  = boardOpt.get();
            TrainRoute alightRoute = alightOpt.get();

            // Compute actual times at each station (train_routes times are local VN times)
            ZonedDateTime boardZdt  = computeStationTime(departureDate, boardRoute.getDepartureTime(), boardRoute.getDayOffset());
            ZonedDateTime alightZdt = computeStationTime(departureDate, alightRoute.getArrivalTime(),  alightRoute.getDayOffset());

            // Duration and nextDay
            Duration dur = Duration.between(boardZdt, alightZdt);
            String duration = dur.toHours() + "h " + dur.toMinutesPart() + "p";
            boolean nextDay = !boardZdt.toLocalDate().equals(alightZdt.toLocalDate());

            int boardStop  = boardRoute.getStopOrder();
            int alightStop = alightRoute.getStopOrder();

            // Ticket price formula
            int distanceKm = (alightRoute.getDistanceKm() != null ? alightRoute.getDistanceKm() : 0)
                           - (boardRoute.getDistanceKm()  != null ? boardRoute.getDistanceKm()  : 0);

            // All physical seats of this train
            List<TrainSeat> allSeats = seatRepository.findAllByTrainId(trainId);

            // Group by carriageType, compute available and price
            Map<String, List<TrainSeat>> byType = allSeats.stream()
                    .collect(Collectors.groupingBy(s -> s.getCarriage().getCarriageType()));

            List<TripResultDTO.CarriagePriceDTO> prices = new ArrayList<>();
            byType.forEach((type, seats) -> {
                long minPrice = computePrice(type, distanceKm);
                long available = seats.stream()
                        .filter(s -> bookingRepository.countConflicts(s.getId(), trip.getId(), boardStop, alightStop) == 0)
                        .count();

                TripResultDTO.CarriagePriceDTO cp = new TripResultDTO.CarriagePriceDTO();
                cp.setCarriageType(type);
                cp.setCarriageTypeLabel(carriageLabel(type));
                cp.setMinPrice(minPrice);
                cp.setAvailableSeats((int) available);
                cp.setTotalSeats(seats.size());
                prices.add(cp);
            });
            prices.sort(Comparator.comparingLong(TripResultDTO.CarriagePriceDTO::getMinPrice));

            TripResultDTO dto = new TripResultDTO();
            dto.setId(trip.getId());
            dto.setTrainId(trainId);
            dto.setTrainCode(trip.getTrain().getTrainCode());
            dto.setTrainName(trip.getTrain().getTrainName());
            dto.setOriginName(boardRoute.getLocation().getName());
            dto.setDestinationName(alightRoute.getLocation().getName());
            dto.setDepartureTime(boardZdt.format(TIME_FMT));
            dto.setArrivalTime(alightZdt.format(TIME_FMT));
            dto.setDepartureDate(boardZdt.format(DATE_FMT));
            dto.setDuration(duration);
            dto.setNextDay(nextDay);
            dto.setBoardStopOrder(boardStop);
            dto.setAlightStopOrder(alightStop);
            dto.setBoardDistanceKm(boardRoute.getDistanceKm());
            dto.setAlightDistanceKm(alightRoute.getDistanceKm());
            dto.setCarriagePrices(prices);
            results.add(dto);
        }

        results.sort(Comparator.comparing(TripResultDTO::getDepartureTime));
        return results;
    }

    /* ── GET /api/trips/{tripId}/seats?originId=X&destinationId=Y ── */
    @GetMapping("/{tripId}/seats")
    public ResponseEntity<?> getSeatsByTrip(
            @PathVariable Integer tripId,
            @RequestParam Integer originId,
            @RequestParam Integer destinationId) {

        Optional<TrainTrip> tripOpt = tripRepository.findById(tripId);
        if (tripOpt.isEmpty()) return ResponseEntity.notFound().build();

        TrainTrip trip    = tripOpt.get();
        Integer   trainId = trip.getTrain().getId();

        Optional<TrainRoute> boardOpt  = routeRepository.findByTrainIdAndLocationId(trainId, originId);
        Optional<TrainRoute> alightOpt = routeRepository.findByTrainIdAndLocationId(trainId, destinationId);
        if (boardOpt.isEmpty() || alightOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ga không thuộc tuyến tàu này"));
        }

        TrainRoute boardRoute  = boardOpt.get();
        TrainRoute alightRoute = alightOpt.get();
        int boardStop  = boardRoute.getStopOrder();
        int alightStop = alightRoute.getStopOrder();

        int distanceKm = (alightRoute.getDistanceKm() != null ? alightRoute.getDistanceKm() : 0)
                       - (boardRoute.getDistanceKm()  != null ? boardRoute.getDistanceKm()  : 0);

        List<TrainSeat> allSeats = seatRepository.findAllByTrainId(trainId);

        Map<Integer, List<SeatDTO>> groupedByCarriage = new LinkedHashMap<>();
        for (TrainSeat seat : allSeats) {
            boolean conflict = bookingRepository.countConflicts(seat.getId(), tripId, boardStop, alightStop) > 0;
            String status = conflict ? "booked" : "available";
            long price = computePrice(seat.getCarriage().getCarriageType(), distanceKm);

            Integer perComp = seat.getCarriage().getSeatsPerCompartment();
            int compartmentNumber = 1;
            try {
                int seatNum = Integer.parseInt(seat.getSeatNumber());
                if (perComp != null && perComp > 0) {
                    compartmentNumber = (int) Math.ceil((double) seatNum / perComp);
                }
            } catch (NumberFormatException ignored) {}

            SeatDTO dto = new SeatDTO();
            dto.setId(seat.getId());
            dto.setSeatNumber(seat.getSeatNumber());
            dto.setBerthPosition(seat.getBerthPosition());
            dto.setCarriageId(seat.getCarriage().getId());
            dto.setCarriageNumber(seat.getCarriage().getCarriageNumber());
            dto.setCarriageType(seat.getCarriage().getCarriageType());
            dto.setStatus(status);
            dto.setTicketPrice(price);
            dto.setCompartmentNumber(compartmentNumber);
            dto.setIsVip(seat.getCarriage().getIsVip());

            groupedByCarriage
                    .computeIfAbsent(seat.getCarriage().getCarriageNumber(), k -> new ArrayList<>())
                    .add(dto);
        }

        return ResponseEntity.ok(groupedByCarriage);
    }

    /* ── GET /api/trips/{tripId}?originId=X&destinationId=Y ── */
    @GetMapping("/{tripId}")
    public ResponseEntity<?> getTripById(
            @PathVariable Integer tripId,
            @RequestParam(required = false) Integer originId,
            @RequestParam(required = false) Integer destinationId) {

        Optional<TrainTrip> tripOpt = tripRepository.findById(tripId);
        if (tripOpt.isEmpty()) return ResponseEntity.notFound().build();

        TrainTrip trip    = tripOpt.get();
        Integer   trainId = trip.getTrain().getId();
        LocalDate depDate = trip.getDepartureDate();

        TrainRoute boardRoute;
        TrainRoute alightRoute;

        if (originId != null && destinationId != null) {
            Optional<TrainRoute> bo = routeRepository.findByTrainIdAndLocationId(trainId, originId);
            Optional<TrainRoute> ao = routeRepository.findByTrainIdAndLocationId(trainId, destinationId);
            if (bo.isEmpty() || ao.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Ga không thuộc tuyến tàu này"));
            }
            boardRoute  = bo.get();
            alightRoute = ao.get();
        } else {
            // Fall back to first and last stops
            List<TrainRoute> routes = routeRepository.findByTrainIdOrderByStopOrder(trainId);
            if (routes.isEmpty()) return ResponseEntity.notFound().build();
            boardRoute  = routes.get(0);
            alightRoute = routes.get(routes.size() - 1);
        }

        ZonedDateTime boardZdt  = computeStationTime(depDate,
                boardRoute.getDepartureTime() != null ? boardRoute.getDepartureTime() : boardRoute.getArrivalTime(),
                boardRoute.getDayOffset());
        ZonedDateTime alightZdt = computeStationTime(depDate,
                alightRoute.getArrivalTime() != null ? alightRoute.getArrivalTime() : alightRoute.getDepartureTime(),
                alightRoute.getDayOffset());

        Duration dur = Duration.between(boardZdt, alightZdt);
        boolean nextDay = !boardZdt.toLocalDate().equals(alightZdt.toLocalDate());

        int distanceKm = (alightRoute.getDistanceKm() != null ? alightRoute.getDistanceKm() : 0)
                       - (boardRoute.getDistanceKm()  != null ? boardRoute.getDistanceKm()  : 0);

        TripResultDTO dto = new TripResultDTO();
        dto.setId(trip.getId());
        dto.setTrainId(trainId);
        dto.setTrainCode(trip.getTrain().getTrainCode());
        dto.setTrainName(trip.getTrain().getTrainName());
        dto.setOriginName(boardRoute.getLocation().getName());
        dto.setDestinationName(alightRoute.getLocation().getName());
        dto.setDepartureTime(boardZdt.format(TIME_FMT));
        dto.setArrivalTime(alightZdt.format(TIME_FMT));
        dto.setDepartureDate(boardZdt.format(DATE_FMT));
        dto.setDuration(dur.toHours() + "h " + dur.toMinutesPart() + "p");
        dto.setNextDay(nextDay);
        dto.setBoardStopOrder(boardRoute.getStopOrder());
        dto.setAlightStopOrder(alightRoute.getStopOrder());
        dto.setBoardDistanceKm(boardRoute.getDistanceKm());
        dto.setAlightDistanceKm(alightRoute.getDistanceKm());

        List<TrainSeat> allSeats = seatRepository.findAllByTrainId(trainId);
        int boardStop  = boardRoute.getStopOrder();
        int alightStop = alightRoute.getStopOrder();
        Map<String, List<TrainSeat>> byType = allSeats.stream()
                .collect(Collectors.groupingBy(s -> s.getCarriage().getCarriageType()));

        List<TripResultDTO.CarriagePriceDTO> prices = new ArrayList<>();
        byType.forEach((type, seats) -> {
            long minPrice  = computePrice(type, distanceKm);
            long available = seats.stream()
                    .filter(s -> bookingRepository.countConflicts(s.getId(), trip.getId(), boardStop, alightStop) == 0)
                    .count();
            TripResultDTO.CarriagePriceDTO cp = new TripResultDTO.CarriagePriceDTO();
            cp.setCarriageType(type);
            cp.setCarriageTypeLabel(carriageLabel(type));
            cp.setMinPrice(minPrice);
            cp.setAvailableSeats((int) available);
            cp.setTotalSeats(seats.size());
            prices.add(cp);
        });
        dto.setCarriagePrices(prices);

        return ResponseEntity.ok(dto);
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private ZonedDateTime computeStationTime(LocalDate tripDate, LocalTime stationTime, Integer dayOffset) {
        if (stationTime == null) stationTime = LocalTime.MIDNIGHT;
        int offset = dayOffset != null ? dayOffset : 0;
        return tripDate.plusDays(offset).atTime(stationTime).atZone(VN);
    }

    private long computePrice(String carriageType, int distanceKm) {
        return switch (carriageType) {
            case "soft_seat"      -> Math.max(60_000L,  (long) distanceKm * 400);
            case "hard_sleeper"   -> Math.max(80_000L,  (long) distanceKm * 600);
            case "soft_sleeper"   -> Math.max(100_000L, (long) distanceKm * 800);
            case "vip_ac_sleeper" -> Math.max(150_000L, (long) distanceKm * 1200);
            default               -> Math.max(50_000L,  (long) distanceKm * 300); // hard_seat
        };
    }

    private String carriageLabel(String type) {
        return switch (type) {
            case "hard_seat"      -> "Ngồi cứng";
            case "soft_seat"      -> "Ngồi mềm";
            case "hard_sleeper"   -> "Giường khoang 6";
            case "soft_sleeper"   -> "Giường khoang 4";
            case "vip_ac_sleeper" -> "Giường VIP";
            default               -> type;
        };
    }
}

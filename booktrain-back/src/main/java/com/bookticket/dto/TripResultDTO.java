package com.bookticket.dto;

import com.bookticket.entity.TrainTrip;
import lombok.Data;
import java.time.Duration;
import java.time.format.DateTimeFormatter;

@Data
public class TripResultDTO {
    private Integer id;
    private String trainCode;
    private String trainName;
    private String trainType;
    private String originName;
    private String destinationName;
    private String departureTime; // "HH:mm"
    private String arrivalTime;   // "HH:mm"
    private String duration;      // "10h 30p"
    private boolean nextDay;      // tàu đến ngày hôm sau
    private String status;
    private java.util.List<CarriagePriceDTO> carriagePrices;

    @Data
    public static class CarriagePriceDTO {
        private String carriageType;
        private String carriageTypeLabel;
        private Long minPrice;
        private Integer availableSeats;
    }

    public static TripResultDTO from(TrainTrip trip) {
        TripResultDTO dto = new TripResultDTO();
        dto.setId(trip.getId());
        dto.setTrainCode(trip.getTrain().getTrainCode());
        dto.setTrainName(trip.getTrain().getTrainName());
        dto.setTrainType(trip.getTrain().getTrainType());
        dto.setOriginName(trip.getOrigin().getName());
        dto.setDestinationName(trip.getDestination().getName());

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        dto.setDepartureTime(trip.getDepartureTime().toLocalDateTime().format(timeFmt));
        dto.setArrivalTime(trip.getArrivalTime().toLocalDateTime().format(timeFmt));

        // Tính thời gian di chuyển
        Duration dur = Duration.between(trip.getDepartureTime(), trip.getArrivalTime());
        long hours = dur.toHours();
        long minutes = dur.toMinutesPart();
        dto.setDuration(hours + "h " + minutes + "p");

        // Kiểm tra tàu đến ngày hôm sau
        dto.setNextDay(!trip.getDepartureTime().toLocalDate()
                .equals(trip.getArrivalTime().toLocalDate()));

        dto.setStatus(trip.getStatus());
        return dto;
    }
}
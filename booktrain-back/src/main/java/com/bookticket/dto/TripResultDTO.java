package com.bookticket.dto;

import lombok.Data;
import java.util.List;

@Data
public class TripResultDTO {
    private Integer id;             // trip ID (frontend uses trip.id)
    private Integer trainId;
    private String  trainCode;
    private String  trainName;
    private String  originName;
    private String  destinationName;
    private String  departureTime;   // "HH:mm" at board station
    private String  arrivalTime;     // "HH:mm" at alight station
    private String  departureDate;   // "dd/MM/yyyy"
    private String  duration;        // "10h 30p"
    private boolean nextDay;
    private Integer boardStopOrder;
    private Integer alightStopOrder;
    private Integer boardDistanceKm;
    private Integer alightDistanceKm;
    private List<CarriagePriceDTO> carriagePrices;

    @Data
    public static class CarriagePriceDTO {
        private String  carriageType;
        private String  carriageTypeLabel;
        private Long    minPrice;
        private Integer availableSeats;
        private Integer totalSeats;
    }
}

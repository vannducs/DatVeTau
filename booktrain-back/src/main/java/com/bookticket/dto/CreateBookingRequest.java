package com.bookticket.dto;

import java.util.List;

public record CreateBookingRequest(
        Long tripId,
        Integer boardLocationId,
        Integer alightLocationId,
        List<PassengerDto> passengers,
        ContactDto contact,
        Long totalPrice,
        Long serviceFee
) {
    public record PassengerDto(
            Long    seatId,
            String  seatNumber,
            String  carriageType,
            Integer carriageNumber,
            Long    ticketPrice,
            String  passengerName,
            String  idNumber,
            String  phoneNumber,
            String  dateOfBirth
    ) {}

    public record ContactDto(
            String name,
            String phone,
            String email
    ) {}
}

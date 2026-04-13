package com.bookticket.dto;

import com.bookticket.entity.TrainSeat;
import lombok.Data;

@Data
public class SeatDTO {
    private Integer id;
    private String seatNumber;
    private String berthPosition;
    private Long ticketPrice;
    private String status;
    private Integer carriageId;
    private Integer carriageNumber;
    private String carriageType;

    public static SeatDTO from(TrainSeat seat) {
        SeatDTO dto = new SeatDTO();
        dto.setId(seat.getId());
        dto.setSeatNumber(seat.getSeatNumber());
        dto.setBerthPosition(seat.getBerthPosition());
        dto.setTicketPrice(seat.getTicketPrice().longValue());
        dto.setStatus(seat.getStatus());
        dto.setCarriageId(seat.getCarriage().getId());
        dto.setCarriageNumber(seat.getCarriage().getCarriageNumber());
        dto.setCarriageType(seat.getCarriage().getCarriageType());
        return dto;
    }
}
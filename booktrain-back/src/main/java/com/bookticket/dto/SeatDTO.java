package com.bookticket.dto;

import lombok.Data;

@Data
public class SeatDTO {
    private Integer id;
    private String  seatNumber;
    private String  berthPosition;
    private Integer carriageId;
    private Integer carriageNumber;
    private String  carriageType;
    private String  status;           // "available" | "booked"
    private Long    ticketPrice;
    private Integer compartmentNumber;
    private Boolean isVip;
}

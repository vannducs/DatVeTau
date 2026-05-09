package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "seat_prices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "trip_id")
    private Integer tripId;

    @Column(name = "carriage_id")
    private Integer carriageId;

    @Column(name = "berth_position")
    private String berthPosition;

    private BigDecimal price;
}

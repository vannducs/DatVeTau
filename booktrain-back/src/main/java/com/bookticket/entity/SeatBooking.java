package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "seat_bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id")
    private TrainSeat seat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private TrainTrip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id")
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_location_id")
    private Location boardLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alight_location_id")
    private Location alightLocation;

    @Column(name = "board_stop_order")
    private Integer boardStopOrder;

    @Column(name = "alight_stop_order")
    private Integer alightStopOrder;

    @Column(name = "ticket_price", precision = 15, scale = 2)
    private BigDecimal ticketPrice;

    private String status; // confirmed | cancelled

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

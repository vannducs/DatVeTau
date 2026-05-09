package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "train_trips")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id")
    private Train train;

    @Column(name = "departure_date")
    private LocalDate departureDate;

    @Column(name = "departure_time")
    private OffsetDateTime departureTime;

    @Column(name = "arrival_time")
    private OffsetDateTime arrivalTime;

    private String status;

    @Column(name = "origin_id")
    private Integer originId;

    @Column(name = "destination_id")
    private Integer destinationId;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "cancelled_by")
    private Integer cancelledBy;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancel_reason")
    private String cancelReason;
}

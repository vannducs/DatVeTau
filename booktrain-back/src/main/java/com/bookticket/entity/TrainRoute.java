package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "train_routes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id")
    private Train train;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column(name = "stop_order")
    private Integer stopOrder;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime;      // null if first stop

    @Column(name = "departure_time")
    private LocalTime departureTime;    // null if last stop

    @Column(name = "day_offset")
    private Integer dayOffset;          // 0, 1, 2…

    @Column(name = "distance_km")
    private Integer distanceKm;
}

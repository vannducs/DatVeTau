package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_seats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carriage_id")
    private TrainCarriage carriage;

    @Column(name = "seat_number")
    private String seatNumber;

    @Column(name = "berth_position")
    private String berthPosition;
}

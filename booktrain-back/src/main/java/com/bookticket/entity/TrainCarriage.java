package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_carriages")
@Data @NoArgsConstructor @AllArgsConstructor
public class TrainCarriage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "train_id")
    private Train train;

    @Column(name = "carriage_number")
    private Integer carriageNumber;

    @Column(name = "carriage_type")
    private String carriageType;

    @Column(name = "seats_per_compartment")
    private Integer seatsPerCompartment;
}

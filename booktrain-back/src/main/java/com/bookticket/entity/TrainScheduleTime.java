package com.bookticket.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_schedule_times")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainScheduleTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "train_id")
    private Integer trainId;

    @Column(name = "origin_id")
    private Integer originId;

    @Column(name = "destination_id")
    private Integer destinationId;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;
}

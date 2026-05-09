package com.bookticket.repository;

import com.bookticket.entity.TrainScheduleTime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainScheduleTimeRepository extends JpaRepository<TrainScheduleTime, Integer> {
    Optional<TrainScheduleTime> findByTrainIdAndOriginIdAndDestinationId(
            Integer trainId, Integer originId, Integer destinationId);
}

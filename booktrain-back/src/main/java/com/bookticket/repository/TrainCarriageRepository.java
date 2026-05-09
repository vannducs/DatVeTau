package com.bookticket.repository;

import com.bookticket.entity.TrainCarriage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainCarriageRepository extends JpaRepository<TrainCarriage, Integer> {
    List<TrainCarriage> findByTrainIdOrderByCarriageNumber(Integer trainId);
    long countByTrainId(Integer trainId);
}

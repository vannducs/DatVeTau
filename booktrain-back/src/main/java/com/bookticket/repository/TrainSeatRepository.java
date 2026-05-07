package com.bookticket.repository;

import com.bookticket.entity.TrainSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrainSeatRepository extends JpaRepository<TrainSeat, Integer> {

    @Query("""
        SELECT s FROM TrainSeat s
        JOIN FETCH s.carriage c
        JOIN FETCH c.train t
        WHERE t.id = :trainId
        ORDER BY c.carriageNumber, s.seatNumber
    """)
    List<TrainSeat> findAllByTrainId(@Param("trainId") Integer trainId);

    List<TrainSeat> findByCarriageIdOrderBySeatNumber(Integer carriageId);
}

package com.bookticket.repository;

import com.bookticket.entity.TrainTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface TrainTripRepository extends JpaRepository<TrainTrip, Integer> {

    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        JOIN FETCH t.origin
        JOIN FETCH t.destination
        WHERE t.origin.id = :originId
          AND t.destination.id = :destinationId
          AND CAST(t.departureTime AS date) = :date
          AND t.status = 'open'
        ORDER BY t.departureTime ASC
    """)
    List<TrainTrip> findTrips(
            @Param("originId") Integer originId,
            @Param("destinationId") Integer destinationId,
            @Param("date") LocalDate date
    );
}
package com.bookticket.repository;

import com.bookticket.entity.TrainTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface TrainTripRepository extends JpaRepository<TrainTrip, Integer> {

    Optional<TrainTrip> findByTrainIdAndDepartureDate(Integer trainId, LocalDate departureDate);

    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        WHERE t.train.id IN :trainIds
          AND t.departureDate = :date
          AND t.status = 'open'
        ORDER BY t.departureTime ASC
    """)
    List<TrainTrip> findByTrainIdsAndDate(
            @Param("trainIds") List<Integer> trainIds,
            @Param("date")     LocalDate date
    );

    Optional<TrainTrip> findTopByTrainIdOrderByDepartureDateDesc(Integer trainId);

    boolean existsByTrainIdAndStatusAndArrivalTimeAfter(Integer trainId, String status, OffsetDateTime time);
}

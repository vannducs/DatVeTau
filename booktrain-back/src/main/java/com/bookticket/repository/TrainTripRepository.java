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

    List<TrainTrip> findByTrainIdAndStatus(Integer trainId, String status);

    boolean existsByTrainIdAndStatusAndArrivalDatetimeAfter(
            Integer trainId, String status, OffsetDateTime time);

    Optional<TrainTrip> findTopByTrainIdOrderByDepartureDatetimeDesc(Integer trainId);

    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        JOIN FETCH t.fromStation
        JOIN FETCH t.toStation
        WHERE t.fromStation.orderIndex <= :fromOrderIndex
          AND t.toStation.orderIndex >= :toOrderIndex
          AND t.status = 'open'
          AND CAST(t.departureDatetime AS date) = :date
        ORDER BY t.departureDatetime ASC
    """)
    List<TrainTrip> findOpenTripsForSegment(
            @Param("fromOrderIndex") Integer fromOrderIndex,
            @Param("toOrderIndex")   Integer toOrderIndex,
            @Param("date")           LocalDate date
    );

    @Query("""
        SELECT t FROM TrainTrip t
        WHERE t.status IN :statuses
          AND t.departureDatetime >= :from
          AND t.departureDatetime <= :to
        ORDER BY t.departureDatetime ASC
    """)
    List<TrainTrip> findByStatusInAndDepartureBetween(
            @Param("statuses") List<String> statuses,
            @Param("from")     OffsetDateTime from,
            @Param("to")       OffsetDateTime to
    );

    // Dùng cho trang admin/trips với filter đa dạng
    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train tr
        JOIN FETCH t.fromStation fs
        JOIN FETCH t.toStation ts
        WHERE (:status IS NULL OR t.status = :status)
          AND (:trainId IS NULL OR tr.id = :trainId)
          AND (:date IS NULL OR CAST(t.departureDatetime AS date) = :date)
        ORDER BY t.departureDatetime DESC
    """)
    List<TrainTrip> findWithFilters(
            @Param("status")  String status,
            @Param("trainId") Integer trainId,
            @Param("date")    LocalDate date
    );
}

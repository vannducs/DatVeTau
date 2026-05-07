package com.bookticket.repository;

import com.bookticket.entity.SeatBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatBookingRepository extends JpaRepository<SeatBooking, Integer> {

    @Query("""
        SELECT COUNT(sb) FROM SeatBooking sb
        WHERE sb.seat.id   = :seatId
          AND sb.trip.id   = :tripId
          AND sb.status    = 'confirmed'
          AND sb.boardStopOrder  < :alightStopOrder
          AND sb.alightStopOrder > :boardStopOrder
    """)
    long countConflicts(
            @Param("seatId")          Integer seatId,
            @Param("tripId")          Integer tripId,
            @Param("boardStopOrder")  int boardStopOrder,
            @Param("alightStopOrder") int alightStopOrder
    );

    List<SeatBooking> findByTripId(Integer tripId);

    List<SeatBooking> findByOrderItemId(Integer orderItemId);
}

package com.bookticket.repository;

import com.bookticket.entity.TrainSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TrainSeatRepository extends JpaRepository<TrainSeat, Integer> {

    // Lấy ghế còn trống (dùng cho trang tìm kiếm)
    @Query("""
        SELECT s FROM TrainSeat s
        JOIN FETCH s.carriage
        WHERE s.trip.id = :tripId
          AND s.status = 'available'
    """)
    List<TrainSeat> findAvailableByTripId(@Param("tripId") Integer tripId);

    // Lấy tất cả ghế (dùng cho sơ đồ ghế)
    @Query("""
        SELECT s FROM TrainSeat s
        JOIN FETCH s.carriage
        WHERE s.trip.id = :tripId
        ORDER BY s.carriage.carriageNumber, s.seatNumber
    """)
    List<TrainSeat> findAllByTripId(@Param("tripId") Integer tripId);
}
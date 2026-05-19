package com.bookticket.repository;

import com.bookticket.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {
    List<Seat> findByCarriageId(Integer carriageId);
    List<Seat> findByCarriageIdOrderBySeatNumberAsc(Integer carriageId);
    void deleteByCarriageId(Integer carriageId);
    int countByCarriageId(Integer carriageId);
}

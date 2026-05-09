package com.bookticket.repository;

import com.bookticket.entity.SeatPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface SeatPriceRepository extends JpaRepository<SeatPrice, Integer> {
    List<SeatPrice> findByTripIdAndCarriageId(Integer tripId, Integer carriageId);

    @Transactional
    void deleteByTripId(Integer tripId);
}

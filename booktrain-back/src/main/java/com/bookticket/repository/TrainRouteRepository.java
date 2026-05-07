package com.bookticket.repository;

import com.bookticket.entity.TrainRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainRouteRepository extends JpaRepository<TrainRoute, Integer> {

    List<TrainRoute> findByTrainIdOrderByStopOrder(Integer trainId);

    @Query("""
        SELECT DISTINCT r1.train.id
        FROM TrainRoute r1, TrainRoute r2
        WHERE r1.train.id = r2.train.id
          AND r1.location.id = :boardLocationId
          AND r2.location.id = :alightLocationId
          AND r1.stopOrder < r2.stopOrder
    """)
    List<Integer> findTrainIdsThroughBothStations(
            @Param("boardLocationId") Integer boardLocationId,
            @Param("alightLocationId") Integer alightLocationId
    );

    Optional<TrainRoute> findByTrainIdAndLocationId(Integer trainId, Integer locationId);
}

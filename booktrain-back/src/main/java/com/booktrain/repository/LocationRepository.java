package com.booktrain.repository;

import com.booktrain.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<Location, Integer> {

    @Query("SELECT l FROM Location l JOIN FETCH l.province WHERE l.locationType = :type ORDER BY l.province.name, l.name")
    List<Location> findByLocationType(@Param("type") String type);

    @Query("SELECT l FROM Location l JOIN FETCH l.province WHERE l.locationType = 'train_station' ORDER BY l.province.name, l.name")
    List<Location> findAllTrainStations();

    @Query("SELECT l FROM Location l JOIN FETCH l.province WHERE l.locationType = 'airport' ORDER BY l.province.name, l.name")
    List<Location> findAllAirports();

    @Query("SELECT l FROM Location l JOIN FETCH l.province WHERE l.locationType = 'bus_station' ORDER BY l.province.name, l.name")
    List<Location> findAllBusStations();
}

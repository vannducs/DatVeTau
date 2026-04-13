package com.bookticket.repository;

import com.bookticket.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LocationRepository extends JpaRepository<Location, Integer> {

    List<Location> findByLocationType(String locationType);

    List<Location> findByLocationTypeAndNameContainingIgnoreCase(
            String locationType, String name);
}
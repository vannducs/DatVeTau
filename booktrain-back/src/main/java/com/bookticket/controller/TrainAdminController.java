package com.bookticket.controller;

import com.bookticket.entity.TrainTrip;
import com.bookticket.repository.TrainTripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class TrainAdminController {

    private final JdbcTemplate jdbc;
    private final TrainTripRepository tripRepository;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private Integer adminId(UserDetails u) {
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Integer.class, u.getUsername());
    }

    private void logAction(Integer adminId, String action, String targetType, Integer targetId, String detail) {
        jdbc.update(
            "INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,NOW())",
            adminId, action, targetType, targetId, detail);
    }

    private boolean hasActiveTrip(Integer trainId) {
        return tripRepository.existsByTrainIdAndStatusAndArrivalTimeAfter(trainId, "open", OffsetDateTime.now());
    }

    private static final String LOCKED_MSG =
        "Không thể chỉnh sửa tàu đang có kế hoạch khởi hành. " +
        "Hãy đợi tất cả kế hoạch kết thúc hoặc hủy kế hoạch trước.";

    // ─── TRAINS ─────────────────────────────────────────────────────────────────

    /** GET /api/admin/trains */
    @GetMapping("/trains")
    public ResponseEntity<List<Map<String, Object>>> listTrains() {
        List<Map<String, Object>> trains = jdbc.queryForList("""
                SELECT t.id, t.train_code, t.train_name, t.train_type,
                       COUNT(DISTINCT tc.id) AS carriage_count,
                       EXISTS(
                           SELECT 1 FROM train_trips tt
                           WHERE tt.train_id = t.id AND tt.status = 'open'
                             AND tt.arrival_time > NOW()
                       ) AS has_active_trip
                FROM trains t
                LEFT JOIN train_carriages tc ON tc.train_id = t.id
                GROUP BY t.id
                ORDER BY t.train_code
                """);
        return ResponseEntity.ok(trains);
    }

    /** GET /api/admin/trains/{trainId} */
    @GetMapping("/trains/{trainId}")
    public ResponseEntity<Map<String, Object>> trainDetail(@PathVariable Integer trainId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, train_code, train_name, train_type FROM trains WHERE id = ?", trainId);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();

        Map<String, Object> train = new HashMap<>(rows.get(0));

        List<Map<String, Object>> carriages = jdbc.queryForList("""
                SELECT id, carriage_number, carriage_type, is_vip, amenities, seats_per_compartment
                FROM train_carriages
                WHERE train_id = ?
                ORDER BY carriage_number
                """, trainId);

        for (Map<String, Object> carriage : carriages) {
            List<Map<String, Object>> seats = jdbc.queryForList("""
                    SELECT id, seat_number, berth_position
                    FROM train_seats
                    WHERE carriage_id = ?
                    ORDER BY seat_number
                    """, carriage.get("id"));
            ((Map<String, Object>) carriage).put("seats", seats);
        }

        train.put("carriages", carriages);
        return ResponseEntity.ok(train);
    }

    record TrainRequest(String trainCode, String trainName, String trainType) {}

    /** POST /api/admin/trains */
    @PostMapping("/trains")
    public ResponseEntity<Map<String, Object>> createTrain(@RequestBody TrainRequest req,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        if (req.trainCode() == null || req.trainCode().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Mã tàu không được trống"));

        try {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO trains (train_code, train_name, train_type) VALUES (?, ?, ?)",
                        new String[] {"id"});
                ps.setString(1, req.trainCode());
                ps.setString(2, req.trainName());
                ps.setString(3, req.trainType() != null ? req.trainType() : "express");
                return ps;
            }, keyHolder);

            Integer newId = Objects.requireNonNull(keyHolder.getKey()).intValue();
            try {
                logAction(adminId(userDetails), "CREATE_TRAIN", "train", newId, "Tạo tàu " + req.trainCode());
            } catch (DataAccessException ignored) {}
            return ResponseEntity.ok(Map.of("success", true, "id", newId, "message", "Tạo tàu thành công"));
        } catch (DuplicateKeyException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã tàu '" + req.trainCode() + "' đã tồn tại"));
        } catch (DataAccessException e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi cơ sở dữ liệu: " + e.getMostSpecificCause().getMessage()));
        }
    }

    record TrainUpdateRequest(String trainName) {}

    /** PUT /api/admin/trains/{trainId} */
    @PutMapping("/trains/{trainId}")
    public ResponseEntity<Map<String, Object>> updateTrain(@PathVariable Integer trainId,
                                                            @RequestBody TrainUpdateRequest req,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        jdbc.update("UPDATE trains SET train_name = ? WHERE id = ?", req.trainName(), trainId);
        logAction(adminId(userDetails), "UPDATE_TRAIN", "train", trainId, "Cập nhật tên tàu");
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thành công"));
    }

    /** DELETE /api/admin/trains/{trainId} */
    @DeleteMapping("/trains/{trainId}")
    public ResponseEntity<Map<String, Object>> deleteTrain(@PathVariable Integer trainId,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        boolean hasTrips = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM train_trips WHERE train_id = ?)",
                Boolean.class, trainId));
        if (hasTrips)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đã có lịch sử chuyến, không thể xóa"));

        jdbc.update("DELETE FROM train_seats WHERE carriage_id IN (SELECT id FROM train_carriages WHERE train_id = ?)", trainId);
        jdbc.update("DELETE FROM train_carriages WHERE train_id = ?", trainId);
        jdbc.update("DELETE FROM trains WHERE id = ?", trainId);
        logAction(adminId(userDetails), "DELETE_TRAIN", "train", trainId, "Xóa tàu ID=" + trainId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa tàu thành công"));
    }

    // ─── TRIP STATUS ─────────────────────────────────────────────────────────────

    /** GET /api/admin/trains/{trainId}/trip-status */
    @GetMapping("/trains/{trainId}/trip-status")
    public ResponseEntity<Map<String, Object>> tripStatus(@PathVariable Integer trainId) {
        boolean active = hasActiveTrip(trainId);

        Optional<TrainTrip> latest = tripRepository.findTopByTrainIdOrderByDepartureDateDesc(trainId);

        LocalDate today = LocalDate.now();
        LocalDate latestAllowedDate = today.plusDays(14);
        LocalDate latestDepartureDate = latest.map(TrainTrip::getDepartureDate).orElse(null);

        LocalDate earliestNewTripDate;
        if (latestDepartureDate != null) {
            LocalDate minFromLatest = latestDepartureDate.plusDays(2);
            earliestNewTripDate = minFromLatest.isBefore(today) ? today : minFromLatest;
        } else {
            earliestNewTripDate = today;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hasActiveTrip", active);
        result.put("latestDepartureDate", latestDepartureDate != null ? latestDepartureDate.toString() : null);
        result.put("earliestNewTripDate", earliestNewTripDate.toString());
        result.put("latestAllowedDate", latestAllowedDate.toString());
        return ResponseEntity.ok(result);
    }

    // ─── CARRIAGES ───────────────────────────────────────────────────────────────

    record CarriageRequest(Integer carriageNumber, String carriageType,
                           Boolean isVip, String amenities, Integer seatsPerCompartment) {}

    /** POST /api/admin/trains/{trainId}/carriages */
    @PostMapping("/trains/{trainId}/carriages")
    public ResponseEntity<Map<String, Object>> addCarriage(@PathVariable Integer trainId,
                                                            @RequestBody CarriageRequest req,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_carriages WHERE train_id = ?", Long.class, trainId);
        if (count != null && count >= 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đã có tối đa 8 toa"));

        int nextNum = req.carriageNumber() != null ? req.carriageNumber() : (count != null ? count.intValue() + 1 : 1);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement("""
                    INSERT INTO train_carriages (train_id, carriage_number, carriage_type, is_vip, amenities, seats_per_compartment)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, new String[] {"id"});
            ps.setInt(1, trainId);
            ps.setInt(2, nextNum);
            ps.setString(3, req.carriageType() != null ? req.carriageType() : "seat");
            ps.setBoolean(4, Boolean.TRUE.equals(req.isVip()));
            ps.setString(5, req.amenities());
            ps.setObject(6, req.seatsPerCompartment());
            return ps;
        }, keyHolder);

        Integer newId = Objects.requireNonNull(keyHolder.getKey()).intValue();
        logAction(adminId(userDetails), "ADD_CARRIAGE", "carriage", newId,
                "Thêm toa " + nextNum + " vào tàu " + trainId);
        return ResponseEntity.ok(Map.of("success", true, "id", newId, "carriageNumber", nextNum));
    }

    /** PUT /api/admin/carriages/{carriageId} */
    @PutMapping("/carriages/{carriageId}")
    public ResponseEntity<Map<String, Object>> updateCarriage(@PathVariable Integer carriageId,
                                                               @RequestBody CarriageRequest req,
                                                               @AuthenticationPrincipal UserDetails userDetails) {
        List<Map<String, Object>> current = jdbc.queryForList(
                "SELECT carriage_type, train_id FROM train_carriages WHERE id = ?", carriageId);
        if (current.isEmpty()) return ResponseEntity.notFound().build();

        Integer trainId = ((Number) current.get(0).get("train_id")).intValue();
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        String currentType = (String) current.get(0).get("carriage_type");
        String newType = req.carriageType() != null ? req.carriageType() : currentType;

        if (!newType.equals(currentType)) {
            jdbc.update("DELETE FROM train_seats WHERE carriage_id = ?", carriageId);
        }

        jdbc.update("""
                UPDATE train_carriages
                SET carriage_type = ?, is_vip = ?, amenities = ?, seats_per_compartment = ?
                WHERE id = ?
                """, newType, Boolean.TRUE.equals(req.isVip()),
                req.amenities(), req.seatsPerCompartment(), carriageId);

        logAction(adminId(userDetails), "UPDATE_CARRIAGE", "carriage", carriageId, "Cập nhật toa");
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật toa thành công"));
    }

    /** DELETE /api/admin/carriages/{carriageId} */
    @DeleteMapping("/carriages/{carriageId}")
    public ResponseEntity<Map<String, Object>> deleteCarriage(@PathVariable Integer carriageId,
                                                               @AuthenticationPrincipal UserDetails userDetails) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT train_id FROM train_carriages WHERE id = ?", carriageId);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();

        Integer trainId = ((Number) rows.get(0).get("train_id")).intValue();
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        jdbc.update("DELETE FROM train_seats WHERE carriage_id = ?", carriageId);
        jdbc.update("DELETE FROM train_carriages WHERE id = ?", carriageId);

        logAction(adminId(userDetails), "DELETE_CARRIAGE", "carriage", carriageId, "Xóa toa ID=" + carriageId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa toa thành công"));
    }

    // ─── SEATS ───────────────────────────────────────────────────────────────────

    record SeatRequest(String seatNumber, String berthPosition) {}

    /** POST /api/admin/carriages/{carriageId}/seats */
    @PostMapping("/carriages/{carriageId}/seats")
    public ResponseEntity<Map<String, Object>> addSeat(@PathVariable Integer carriageId,
                                                        @RequestBody SeatRequest req,
                                                        @AuthenticationPrincipal UserDetails userDetails) {
        List<Map<String, Object>> typeRows = jdbc.queryForList(
                "SELECT carriage_type, train_id FROM train_carriages WHERE id = ?", carriageId);
        if (typeRows.isEmpty()) return ResponseEntity.notFound().build();

        Integer trainId = ((Number) typeRows.get(0).get("train_id")).intValue();
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        String carriageType = (String) typeRows.get(0).get("carriage_type");
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM train_seats WHERE carriage_id = ?", Long.class, carriageId);
        long cnt = count != null ? count : 0L;

        if ("seat".equals(carriageType) && cnt >= 32)
            return ResponseEntity.badRequest().body(Map.of("message", "Toa ghế ngồi tối đa 32 ghế"));
        if ("sleeper".equals(carriageType) && cnt >= 18)
            return ResponseEntity.badRequest().body(Map.of("message", "Toa ghế nằm đã đầy (tối đa 18 ghế)"));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO train_seats (carriage_id, seat_number, berth_position) VALUES (?, ?, ?)",
                    new String[] {"id"});
            ps.setInt(1, carriageId);
            ps.setString(2, req.seatNumber());
            ps.setString(3, req.berthPosition());
            return ps;
        }, keyHolder);

        Integer newId = Objects.requireNonNull(keyHolder.getKey()).intValue();
        logAction(adminId(userDetails), "ADD_SEAT", "seat", newId, "Thêm ghế vào toa " + carriageId);
        return ResponseEntity.ok(Map.of("success", true, "id", newId));
    }

    /** DELETE /api/admin/seats/{seatId} */
    @DeleteMapping("/seats/{seatId}")
    public ResponseEntity<Map<String, Object>> deleteSeat(@PathVariable Integer seatId,
                                                           @AuthenticationPrincipal UserDetails userDetails) {
        List<Map<String, Object>> seatRows = jdbc.queryForList("""
                SELECT tc.train_id FROM train_seats ts
                JOIN train_carriages tc ON tc.id = ts.carriage_id
                WHERE ts.id = ?
                """, seatId);
        if (seatRows.isEmpty()) return ResponseEntity.notFound().build();

        Integer trainId = ((Number) seatRows.get(0).get("train_id")).intValue();
        if (hasActiveTrip(trainId))
            return ResponseEntity.badRequest().body(Map.of("message", LOCKED_MSG));

        int rows = jdbc.update("DELETE FROM train_seats WHERE id = ?", seatId);
        if (rows == 0) return ResponseEntity.notFound().build();

        logAction(adminId(userDetails), "DELETE_SEAT", "seat", seatId, "Xóa ghế ID=" + seatId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Xóa ghế thành công"));
    }

    // ─── VALIDATE ────────────────────────────────────────────────────────────────

    /** GET /api/admin/trains/{trainId}/validate */
    @GetMapping("/trains/{trainId}/validate")
    public ResponseEntity<Map<String, Object>> validateTrain(@PathVariable Integer trainId) {
        List<String> errors = new ArrayList<>();

        List<Map<String, Object>> carriages = jdbc.queryForList("""
                SELECT tc.id, tc.carriage_number, tc.carriage_type,
                       COUNT(ts.id) AS seat_count
                FROM train_carriages tc
                LEFT JOIN train_seats ts ON ts.carriage_id = tc.id
                WHERE tc.train_id = ?
                GROUP BY tc.id, tc.carriage_number, tc.carriage_type
                ORDER BY tc.carriage_number
                """, trainId);

        if (carriages.isEmpty()) {
            errors.add("Tàu phải có ít nhất 1 toa");
        }

        for (Map<String, Object> c : carriages) {
            int num = ((Number) c.get("carriage_number")).intValue();
            String type = (String) c.get("carriage_type");
            long seats = ((Number) c.get("seat_count")).longValue();

            if ("seat".equals(type)) {
                if (seats < 1) errors.add("Toa " + num + " (ghế ngồi) phải có ít nhất 1 ghế");
                if (seats > 32) errors.add("Toa " + num + " (ghế ngồi) tối đa 32 ghế");
            } else if ("sleeper".equals(type)) {
                if (seats < 2) errors.add("Toa " + num + " (ghế nằm) phải có ít nhất 1 khoang (2 ghế)");
                if (seats > 18) errors.add("Toa " + num + " (ghế nằm) tối đa 6 khoang (18 ghế)");
            }
        }

        return ResponseEntity.ok(Map.of("valid", errors.isEmpty(), "errors", errors));
    }

    // ─── TRAIN ROUTE HELPERS ─────────────────────────────────────────────────────

    /** GET /api/admin/trains/{trainId}/available-stations */
    @GetMapping("/trains/{trainId}/available-stations")
    public ResponseEntity<List<Map<String, Object>>> availableStations(@PathVariable Integer trainId) {
        List<Map<String, Object>> stations = jdbc.queryForList("""
                SELECT tr.id AS route_id, tr.stop_order, tr.day_offset,
                       l.id AS location_id, l.name AS location_name
                FROM train_routes tr
                JOIN locations l ON l.id = tr.location_id
                WHERE tr.train_id = ?
                ORDER BY tr.stop_order
                """, trainId);
        return ResponseEntity.ok(stations);
    }

    /** GET /api/admin/trains/{trainId}/schedule-duration?originId=X&destinationId=Y */
    @GetMapping("/trains/{trainId}/schedule-duration")
    public ResponseEntity<Map<String, Object>> scheduleDuration(
            @PathVariable Integer trainId,
            @RequestParam Integer originId,
            @RequestParam Integer destinationId) {

        // 1) Exact match in train_schedule_times
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT duration_minutes FROM train_schedule_times
                WHERE train_id = ? AND origin_id = ? AND destination_id = ?
                """, trainId, originId, destinationId);

        if (!rows.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "durationMinutes", rows.get(0).get("duration_minutes"),
                    "found", true));
        }

        // 2) Fallback: calculate from train_routes using departure_time/arrival_time + day_offset
        try {
            List<Map<String, Object>> originRoute = jdbc.queryForList("""
                    SELECT departure_time, day_offset FROM train_routes
                    WHERE train_id = ? AND location_id = ?
                    """, trainId, originId);
            List<Map<String, Object>> destRoute = jdbc.queryForList("""
                    SELECT arrival_time, day_offset FROM train_routes
                    WHERE train_id = ? AND location_id = ?
                    """, trainId, destinationId);

            if (!originRoute.isEmpty() && !destRoute.isEmpty()) {
                Object depTimeObj = originRoute.get(0).get("departure_time");
                Object arrTimeObj = destRoute.get(0).get("arrival_time");
                int depOffset = ((Number) originRoute.get(0).get("day_offset")).intValue();
                int arrOffset = ((Number) destRoute.get(0).get("day_offset")).intValue();

                if (depTimeObj != null && arrTimeObj != null) {
                    java.time.LocalTime depTime = ((java.sql.Time) depTimeObj).toLocalTime();
                    java.time.LocalTime arrTime = ((java.sql.Time) arrTimeObj).toLocalTime();

                    long depMinutes = depOffset * 24 * 60L + depTime.getHour() * 60L + depTime.getMinute();
                    long arrMinutes = arrOffset * 24 * 60L + arrTime.getHour() * 60L + arrTime.getMinute();
                    long duration = arrMinutes - depMinutes;

                    if (duration > 0) {
                        return ResponseEntity.ok(Map.of(
                                "durationMinutes", duration,
                                "found", true));
                    }
                }
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of("durationMinutes", (Object) null, "found", false));
    }

    /** GET /api/admin/trains/{trainId}/carriages — for trip wizard step 3 */
    @GetMapping("/trains/{trainId}/carriages")
    public ResponseEntity<List<Map<String, Object>>> trainCarriages(@PathVariable Integer trainId) {
        List<Map<String, Object>> carriages = jdbc.queryForList("""
                SELECT tc.id, tc.carriage_number, tc.carriage_type, tc.is_vip,
                       COUNT(ts.id) AS seat_count
                FROM train_carriages tc
                LEFT JOIN train_seats ts ON ts.carriage_id = tc.id
                WHERE tc.train_id = ?
                GROUP BY tc.id, tc.carriage_number, tc.carriage_type, tc.is_vip
                ORDER BY tc.carriage_number
                """, trainId);
        return ResponseEntity.ok(carriages);
    }
}

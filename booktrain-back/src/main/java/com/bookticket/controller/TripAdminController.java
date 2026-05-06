package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/trips")
@RequiredArgsConstructor
public class TripAdminController {

    private final JdbcTemplate jdbc;

    record TripRequest(
            Integer trainId,
            Integer originId,
            Integer destinationId,
            String  departureTime,
            String  arrivalTime,
            String  status
    ) {}

    /** GET /api/admin/trips?page=0&size=10&search= */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")   int    page,
            @RequestParam(defaultValue = "10")  int    size,
            @RequestParam(defaultValue = "")    String search) {

        String like = "%" + search + "%";

        long total = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM train_trips tt
                JOIN trains    tr ON tr.id = tt.train_id
                JOIN locations l1 ON l1.id = tt.origin_id
                JOIN locations l2 ON l2.id = tt.destination_id
                WHERE tr.train_code ILIKE ? OR l1.name ILIKE ? OR l2.name ILIKE ?
                """, Long.class, like, like, like);

        List<Map<String, Object>> trips = jdbc.queryForList("""
                SELECT tt.id, tr.train_code, tr.train_name,
                       l1.name AS origin_name, l2.name AS destination_name,
                       tt.departure_time, tt.arrival_time, tt.status
                FROM train_trips tt
                JOIN trains    tr ON tr.id = tt.train_id
                JOIN locations l1 ON l1.id = tt.origin_id
                JOIN locations l2 ON l2.id = tt.destination_id
                WHERE tr.train_code ILIKE ? OR l1.name ILIKE ? OR l2.name ILIKE ?
                ORDER BY tt.departure_time DESC
                LIMIT ? OFFSET ?
                """, like, like, like, size, (long) page * size);

        Map<String, Object> result = new HashMap<>();
        result.put("trips", trips);
        result.put("total", total);
        result.put("page",  page);
        result.put("size",  size);
        return ResponseEntity.ok(result);
    }

    /** GET /api/admin/trips/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Integer id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT tt.id, tt.train_id, tr.train_code, tr.train_name,
                       tt.origin_id, l1.name AS origin_name,
                       tt.destination_id, l2.name AS destination_name,
                       tt.departure_time, tt.arrival_time, tt.status
                FROM train_trips tt
                JOIN trains    tr ON tr.id = tt.train_id
                JOIN locations l1 ON l1.id = tt.origin_id
                JOIN locations l2 ON l2.id = tt.destination_id
                WHERE tt.id = ?
                """, id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(rows.get(0));
    }

    /** POST /api/admin/trips */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody TripRequest req) {
        jdbc.update("""
                INSERT INTO train_trips (train_id, origin_id, destination_id, departure_time, arrival_time, status)
                VALUES (?, ?, ?, ?::timestamptz, ?::timestamptz, ?)
                """,
                req.trainId(), req.originId(), req.destinationId(),
                req.departureTime(), req.arrivalTime(),
                req.status() != null ? req.status() : "open");
        return ResponseEntity.ok(Map.of("success", true, "message", "Tạo chuyến tàu thành công"));
    }

    /** PUT /api/admin/trips/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody TripRequest req) {
        int rows = jdbc.update("""
                UPDATE train_trips
                SET train_id = ?, origin_id = ?, destination_id = ?,
                    departure_time = ?::timestamptz, arrival_time = ?::timestamptz, status = ?
                WHERE id = ?
                """,
                req.trainId(), req.originId(), req.destinationId(),
                req.departureTime(), req.arrivalTime(), req.status(), id);
        if (rows == 0) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật thành công"));
    }

    /** DELETE /api/admin/trips/{id} — soft delete: set status = cancelled */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        int rows = jdbc.update("UPDATE train_trips SET status = 'cancelled' WHERE id = ?", id);
        if (rows == 0) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã huỷ chuyến tàu"));
    }

    /** GET /api/admin/trips/trains — danh sách tàu cho select form */
    @GetMapping("/trains")
    public ResponseEntity<List<Map<String, Object>>> trainList() {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT id, train_code, train_name FROM trains ORDER BY train_code ASC"));
    }
}

package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/seats")
@RequiredArgsConstructor
public class SeatAdminController {

    private final JdbcTemplate jdbc;

    record StatusRequest(String status) {}

    /** GET /api/admin/seats/stats — thống kê tổng quan */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Map<String, Object> data = new HashMap<>();
        data.put("available", jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_seats WHERE status = 'available'", Long.class));
        data.put("booked", jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_seats WHERE status = 'booked'", Long.class));
        data.put("pending", jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_seats WHERE status = 'pending'", Long.class));
        data.put("unavailable", jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_seats WHERE status = 'unavailable'", Long.class));
        data.put("total", jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_seats", Long.class));
        return ResponseEntity.ok(data);
    }

    /** GET /api/admin/seats/trips/{tripId} — danh sách ghế theo chuyến */
    @GetMapping("/trips/{tripId}")
    public ResponseEntity<List<Map<String, Object>>> seatsByTrip(@PathVariable Integer tripId) {
        String sql = """
                SELECT ts.id, ts.seat_number, ts.berth_position, ts.ticket_price, ts.status,
                       tc.carriage_number, tc.carriage_type
                FROM train_seats ts
                JOIN train_carriages tc ON tc.id = ts.carriage_id
                WHERE ts.trip_id = ?
                ORDER BY tc.carriage_number, ts.seat_number
                """;
        return ResponseEntity.ok(jdbc.queryForList(sql, tripId));
    }

    /** PUT /api/admin/seats/{seatId}/status */
    @PutMapping("/{seatId}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Integer seatId,
            @RequestBody StatusRequest req) {

        if (!List.of("available", "booked", "pending", "unavailable").contains(req.status())) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Trạng thái không hợp lệ"));
        }
        int rows = jdbc.update("UPDATE train_seats SET status = ? WHERE id = ?", req.status(), seatId);
        if (rows == 0) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật trạng thái ghế thành công"));
    }
}

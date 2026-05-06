package com.bookticket.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/locations")
@RequiredArgsConstructor
public class LocationAdminController {

    private final JdbcTemplate jdbc;

    record LocationRequest(
            String  name,
            String  locationType,
            Integer provinceId,
            String  address,
            Double  latitude,
            Double  longitude,
            String  iataCode
    ) {}

    /** GET /api/admin/locations */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(defaultValue = "") String search) {

        String like = "%" + search + "%";
        String sql = """
                SELECT l.id, l.name, l.location_type, l.address,
                       l.latitude, l.longitude, l.iata_code,
                       p.id AS province_id, p.name AS province_name
                FROM locations l
                LEFT JOIN provinces p ON p.id = l.province_id
                WHERE l.name ILIKE ? OR l.iata_code ILIKE ?
                ORDER BY l.name ASC
                """;
        return ResponseEntity.ok(jdbc.queryForList(sql, like, like));
    }

    /** POST /api/admin/locations */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody LocationRequest req) {
        jdbc.update("""
                INSERT INTO locations (name, location_type, province_id, address, latitude, longitude, iata_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                req.name(), req.locationType(), req.provinceId(),
                req.address(), req.latitude(), req.longitude(), req.iataCode());
        return ResponseEntity.ok(Map.of("success", true, "message", "Thêm ga tàu thành công"));
    }

    /** PUT /api/admin/locations/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Integer id, @RequestBody LocationRequest req) {
        int rows = jdbc.update("""
                UPDATE locations
                SET name = ?, location_type = ?, province_id = ?,
                    address = ?, latitude = ?, longitude = ?, iata_code = ?
                WHERE id = ?
                """,
                req.name(), req.locationType(), req.provinceId(),
                req.address(), req.latitude(), req.longitude(), req.iataCode(), id);
        if (rows == 0) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("success", true, "message", "Cập nhật ga tàu thành công"));
    }

    /** DELETE /api/admin/locations/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        try {
            int rows = jdbc.update("DELETE FROM locations WHERE id = ?", id);
            if (rows == 0) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa ga tàu"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Không thể xóa: ga tàu đang được dùng trong chuyến tàu"));
        }
    }

    /** GET /api/admin/provinces — danh sách tỉnh/thành cho select */
    @GetMapping("/provinces")
    public ResponseEntity<List<Map<String, Object>>> provinces() {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT id, name FROM provinces ORDER BY name ASC"));
    }
}

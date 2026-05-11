package com.bookticket.controller;

import com.bookticket.entity.TrainTrip;
import com.bookticket.repository.TrainTripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

@RestController
@RequestMapping("/api/admin/trips")
@RequiredArgsConstructor
public class TripAdminController {

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

    // ─── LIST ────────────────────────────────────────────────────────────────────

    /** GET /api/admin/trips?page&size&status&trainId&date&search */
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "10") int    size,
            @RequestParam(defaultValue = "")   String status,
            @RequestParam(required = false)    Integer trainId,
            @RequestParam(required = false)    String  date,
            @RequestParam(defaultValue = "")   String  search) {

        StringBuilder where = new StringBuilder("WHERE tt.departure_date >= CURRENT_DATE ");
        List<Object> params = new ArrayList<>();

        if (!status.isEmpty()) {
            where.append("AND tt.status = ? ");
            params.add(status);
        }
        if (trainId != null) {
            where.append("AND tt.train_id = ? ");
            params.add(trainId);
        }
        if (date != null && !date.isEmpty()) {
            where.append("AND tt.departure_date = ?::date ");
            params.add(date);
        }
        if (!search.isEmpty()) {
            where.append("AND (tr.train_code ILIKE ? OR COALESCE(l1.name,'') ILIKE ? OR COALESCE(l2.name,'') ILIKE ?) ");
            String like = "%" + search + "%";
            params.add(like); params.add(like); params.add(like);
        }

        String baseFrom = """
                FROM train_trips tt
                JOIN trains tr ON tr.id = tt.train_id
                LEFT JOIN locations l1 ON l1.id = tt.origin_id
                LEFT JOIN locations l2 ON l2.id = tt.destination_id
                """ + where;

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + baseFrom, Long.class, params.toArray());

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add((long) page * size);

        List<Map<String, Object>> trips = jdbc.queryForList("""
                SELECT tt.id, tt.departure_date, tt.departure_time, tt.arrival_time, tt.status,
                       tr.id AS train_id, tr.train_code, tr.train_name,
                       COALESCE(l1.name, '') AS origin_name,
                       COALESCE(l2.name, '') AS destination_name,
                       tt.cancel_reason, tt.cancelled_at,
                       (SELECT COUNT(*) FROM seat_bookings sb WHERE sb.trip_id = tt.id AND sb.status = 'confirmed') AS confirmed_bookings
                """ + baseFrom + "ORDER BY tt.departure_time ASC LIMIT ? OFFSET ?",
                pageParams.toArray());

        return ResponseEntity.ok(Map.of(
                "trips", trips,
                "total", total != null ? total : 0L,
                "page", page,
                "size", size));
    }

    // ─── DETAIL ──────────────────────────────────────────────────────────────────

    /** GET /api/admin/trips/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Integer id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT tt.id, tt.train_id, tr.train_code, tr.train_name,
                       tt.origin_id, COALESCE(l1.name,'') AS origin_name,
                       tt.destination_id, COALESCE(l2.name,'') AS destination_name,
                       tt.departure_date, tt.departure_time, tt.arrival_time,
                       tt.status, tt.cancel_reason, tt.cancelled_at, tt.created_by
                FROM train_trips tt
                JOIN trains tr ON tr.id = tt.train_id
                LEFT JOIN locations l1 ON l1.id = tt.origin_id
                LEFT JOIN locations l2 ON l2.id = tt.destination_id
                WHERE tt.id = ?
                """, id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(rows.get(0));
    }

    // ─── CANCEL INFO ─────────────────────────────────────────────────────────────

    /** GET /api/admin/trips/{tripId}/cancel-info */
    @GetMapping("/{tripId}/cancel-info")
    public ResponseEntity<Map<String, Object>> cancelInfo(@PathVariable Integer tripId) {
        Long affectedOrders = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT oi.order_id)
                FROM seat_bookings sb
                JOIN order_items oi ON oi.id = sb.order_item_id
                WHERE sb.trip_id = ? AND sb.status = 'confirmed'
                """, Long.class, tripId);
        return ResponseEntity.ok(Map.of("affectedOrders", affectedOrders != null ? affectedOrders : 0L));
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────────

    record SeatPriceEntry(Integer carriageId, String berthPosition, Long price) {}

    record TripCreateRequest(
            Integer trainId,
            Integer originId,
            Integer destinationId,
            String  departureDate,
            String  departureTime,
            Integer durationMinutes,
            List<SeatPriceEntry> seatPrices) {}

    /** POST /api/admin/trips */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createTrip(
            @RequestBody TripCreateRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        LocalDate depDate = LocalDate.parse(req.departureDate());

        // 1. Validate within 2 weeks
        if (depDate.isAfter(LocalDate.now().plusDays(14))) {
            return ResponseEntity.badRequest().body(Map.of("message",
                "Chỉ được lên kế hoạch trong vòng 2 tuần từ hôm nay (đến ngày "
                + LocalDate.now().plusDays(14) + ")"));
        }

        // 2. Validate at least 2 days from latest trip
        Optional<TrainTrip> latestTrip = tripRepository.findTopByTrainIdOrderByDepartureDateDesc(req.trainId());
        if (latestTrip.isPresent()) {
            LocalDate minAllowedDate = latestTrip.get().getDepartureDate().plusDays(2);
            if (depDate.isBefore(minAllowedDate)) {
                return ResponseEntity.badRequest().body(Map.of("message",
                    "Kế hoạch mới phải cách kế hoạch gần nhất ít nhất 2 ngày. "
                    + "Ngày sớm nhất có thể lên kế hoạch: " + minAllowedDate));
            }
        }

        // 3. Validate no active (in-progress) trip
        boolean hasActiveTrip = tripRepository.existsByTrainIdAndStatusAndArrivalTimeAfter(
            req.trainId(), "open", OffsetDateTime.now()
        );
        if (hasActiveTrip) {
            return ResponseEntity.badRequest().body(Map.of("message",
                "Tàu này đang có kế hoạch chưa hoàn thành. "
                + "Vui lòng đợi chuyến hiện tại kết thúc hoặc hủy kế hoạch."));
        }

        // 4. Validate train has >= 4 carriages
        Long carriageCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM train_carriages WHERE train_id = ?", Long.class, req.trainId());
        if (carriageCount == null || carriageCount < 4)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu phải có ít nhất 4 toa để lên kế hoạch"));

        // 5. Get duration: use frontend-provided value, fallback to DB
        int durationMinutes;
        if (req.durationMinutes() != null && req.durationMinutes() > 0) {
            durationMinutes = req.durationMinutes();
        } else {
            List<Map<String, Object>> durationRows = jdbc.queryForList("""
                    SELECT duration_minutes FROM train_schedule_times
                    WHERE train_id = ? AND origin_id = ? AND destination_id = ?
                    """, req.trainId(), req.originId(), req.destinationId());
            if (durationRows.isEmpty())
                return ResponseEntity.badRequest().body(Map.of("message",
                    "Không tìm thấy thời gian cho tuyến này. Vui lòng nhập thời gian di chuyển dự kiến."));
            durationMinutes = ((Number) durationRows.get(0).get("duration_minutes")).intValue();
        }

        // 6. Parse departure and compute arrival
        LocalDateTime departureLdt = LocalDateTime.parse(req.departureDate() + "T" + req.departureTime());
        OffsetDateTime departureOdt = departureLdt.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toOffsetDateTime();
        OffsetDateTime arrivalOdt   = departureOdt.plusMinutes(durationMinutes);

        // 7. Validate arrival > NOW()
        if (arrivalOdt.isBefore(OffsetDateTime.now()))
            return ResponseEntity.badRequest().body(Map.of("message", "Giờ đến phải sau thời điểm hiện tại"));

        // 8. Validate seat prices provided
        if (req.seatPrices() == null || req.seatPrices().isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Phải nhập giá vé cho tất cả các toa"));

        // 9. Insert train_trip
        Integer currentAdminId = adminId(userDetails);
        final OffsetDateTime finalDep = departureOdt;
        final OffsetDateTime finalArr = arrivalOdt;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement("""
                    INSERT INTO train_trips
                        (train_id, origin_id, destination_id, departure_date,
                         departure_time, arrival_time, status, created_by)
                    VALUES (?, ?, ?, ?::date, ?::timestamptz, ?::timestamptz, 'open', ?)
                    """, new String[] {"id"});
            ps.setInt(1, req.trainId());
            ps.setInt(2, req.originId());
            ps.setInt(3, req.destinationId());
            ps.setString(4, req.departureDate());
            ps.setString(5, finalDep.toString());
            ps.setString(6, finalArr.toString());
            ps.setInt(7, currentAdminId);
            return ps;
        }, keyHolder);

        Integer tripId = Objects.requireNonNull(keyHolder.getKey()).intValue();

        // 10. Insert seat_prices
        for (SeatPriceEntry entry : req.seatPrices()) {
            jdbc.update("""
                    INSERT INTO seat_prices (trip_id, carriage_id, berth_position, price)
                    VALUES (?, ?, ?, ?)
                    """, tripId, entry.carriageId(), entry.berthPosition(), entry.price());
        }

        logAction(currentAdminId, "CREATE_TRIP", "trip", tripId,
                "Lên kế hoạch chuyến tàu ID=" + tripId + " ngày " + req.departureDate());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "tripId", tripId,
                "message", "Lên kế hoạch chuyến tàu thành công"));
    }

    // ─── CANCEL ──────────────────────────────────────────────────────────────────

    record CancelRequest(String cancelReason) {}

    /** PUT /api/admin/trips/{tripId}/cancel */
    @PutMapping("/{tripId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelTrip(
            @PathVariable Integer tripId,
            @RequestBody CancelRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        // 1. Verify trip is open
        List<Map<String, Object>> tripRows = jdbc.queryForList("""
                SELECT tt.id, t.train_code, tt.departure_date,
                       COALESCE(l1.name,'') AS origin_name,
                       COALESCE(l2.name,'') AS destination_name
                FROM train_trips tt
                JOIN trains t ON t.id = tt.train_id
                LEFT JOIN locations l1 ON l1.id = tt.origin_id
                LEFT JOIN locations l2 ON l2.id = tt.destination_id
                WHERE tt.id = ? AND tt.status = 'open'
                """, tripId);

        if (tripRows.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy chuyến tàu hoặc đã bị hủy"));

        Map<String, Object> tripInfo = tripRows.get(0);
        String trainCode     = (String) tripInfo.get("train_code");
        String departureDate = tripInfo.get("departure_date").toString();
        String originName    = (String) tripInfo.get("origin_name");
        String destName      = (String) tripInfo.get("destination_name");

        // 2. Find confirmed bookings and their orders
        List<Map<String, Object>> bookings = jdbc.queryForList("""
                SELECT sb.id AS booking_id,
                       oi.order_id,
                       o.customer_id, o.total_amount, o.order_code
                FROM seat_bookings sb
                JOIN order_items oi ON oi.id = sb.order_item_id
                JOIN orders o ON o.id = oi.order_id
                WHERE sb.trip_id = ? AND sb.status = 'confirmed'
                """, tripId);

        // 3. Process each unique order
        Set<Integer> processedOrders = new LinkedHashSet<>();
        for (Map<String, Object> b : bookings) {
            Integer orderId = ((Number) b.get("order_id")).intValue();
            if (processedOrders.contains(orderId)) continue;
            processedOrders.add(orderId);

            jdbc.update("UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?", orderId);
            jdbc.update("""
                    UPDATE payments SET status = 'refunded'
                    WHERE order_id = ? AND status IN ('pending', 'success')
                    """, orderId);

            Integer customerId = ((Number) b.get("customer_id")).intValue();
            long totalAmount = b.get("total_amount") instanceof Number
                    ? ((Number) b.get("total_amount")).longValue() : 0L;

            String notifBody = String.format(
                    "Chuyến %s ngày %s từ %s đến %s đã bị hủy. Số tiền %,dđ đã được hoàn vào tài khoản của bạn.",
                    trainCode, departureDate, originName, destName, totalAmount);

            jdbc.update("""
                    INSERT INTO notifications (user_id, title, body, noti_type, is_read, created_at)
                    VALUES (?, 'Chuyến tàu bị hủy — Hoàn tiền thành công', ?, 'cancellation', false, NOW())
                    """, customerId, notifBody);
        }

        // 4. Cancel all seat_bookings
        jdbc.update("""
                UPDATE seat_bookings SET status = 'cancelled'
                WHERE trip_id = ? AND status = 'confirmed'
                """, tripId);

        // 5. Update trip
        Integer currentAdminId = adminId(userDetails);
        jdbc.update("""
                UPDATE train_trips
                SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW(), cancel_reason = ?
                WHERE id = ?
                """, currentAdminId, req.cancelReason(), tripId);

        logAction(currentAdminId, "CANCEL_TRIP", "trip", tripId,
                "Hủy chuyến " + trainCode + " ngày " + departureDate +
                ", hoàn tiền " + processedOrders.size() + " đơn");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "affectedOrders", processedOrders.size(),
                "message", "Đã hủy chuyến tàu, hoàn tiền cho " + processedOrders.size() + " khách"));
    }

    // ─── TRAIN LIST (dropdown) ────────────────────────────────────────────────────

    /** GET /api/admin/trips/trains */
    @GetMapping("/trains")
    public ResponseEntity<List<Map<String, Object>>> trainList() {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT id, train_code, train_name FROM trains ORDER BY train_code"));
    }
}

package com.bookticket.controller;

import com.bookticket.entity.*;
import com.bookticket.repository.*;
import com.bookticket.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/trips")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TripAdminController {

    private final TrainTripRepository        tripRepo;
    private final TrainRepository            trainRepo;
    private final TrainStationRepository     stationRepo;
    private final TrainCarriageAssignmentRepository assignmentRepo;
    private final TripSegmentPriceRepository priceRepo;
    private final SeatBookingRepository      seatBookingRepo;
    private final OrderItemRepository        orderItemRepo;
    private final OrderRepository            orderRepo;
    private final PaymentRepository          paymentRepo;
    private final NotificationRepository     notificationRepo;
    private final UserRepository             userRepo;
    private final AdminLogRepository         adminLogRepo;
    private final TripService                tripService;

    // ─── LIST ────────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0")  int     page,
            @RequestParam(defaultValue = "10") int     size,
            @RequestParam(required = false)    String  status,
            @RequestParam(required = false)    Integer trainId,
            @RequestParam(required = false)    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        List<TrainTrip> all = tripRepo.findWithFilters(status, trainId, date);
        int total = all.size();
        List<TrainTrip> paged = all.stream()
                .skip((long) page * size).limit(size).toList();

        List<Map<String, Object>> trips = paged.stream().map(t -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              t.getId());
            m.put("train_id",        t.getTrain().getId());
            m.put("train_code",      t.getTrain().getTrainCode());
            m.put("train_name",      t.getTrain().getTrainName());
            m.put("origin_name",     t.getFromStation().getName());
            m.put("destination_name",t.getToStation().getName());
            m.put("departure_time",  t.getDepartureDatetime());
            m.put("arrival_time",    t.getArrivalDatetime());
            m.put("status",          t.getStatus());
            long confirmedBookings = seatBookingRepo.findByTripIdAndStatus(t.getId(), "confirmed").size();
            m.put("confirmed_bookings", confirmedBookings);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("trips", trips, "total", total));
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────────

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        Integer trainId         = (Integer) body.get("trainId");
        Integer fromStationId   = (Integer) body.get("fromStationId");
        Integer toStationId     = (Integer) body.get("toStationId");
        String  departureDatetime = (String)  body.get("departureDatetime");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> segmentPrices =
                (List<Map<String, Object>>) body.get("segmentPrices");

        Train train = trainRepo.findById(trainId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tàu"));
        TrainStation fromStation = stationRepo.findById(fromStationId)
                .orElseThrow(() -> new RuntimeException("Ga đi không tồn tại"));
        TrainStation toStation   = stationRepo.findById(toStationId)
                .orElseThrow(() -> new RuntimeException("Ga đến không tồn tại"));

        // Validate: cần ≥ 4 toa
        int carriageCount = assignmentRepo.countByTrainIdAndUnassignedAtIsNull(trainId);
        if (carriageCount < 4)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu cần ít nhất 4 toa đang gắn (hiện có " + carriageCount + ")"));

        // Validate: không có chuyến active
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trainId, "open", OffsetDateTime.now());
        if (hasActive)
            return ResponseEntity.badRequest().body(Map.of("message", "Tàu đang có chuyến chưa kết thúc"));

        OffsetDateTime depDt = OffsetDateTime.parse(departureDatetime);

        // Validate: trong 2 tuần tới
        OffsetDateTime now     = OffsetDateTime.now();
        OffsetDateTime twoWeeks = now.plusDays(14);
        if (depDt.isBefore(now))
            return ResponseEntity.badRequest().body(Map.of("message", "Thời gian khởi hành phải sau hiện tại"));
        if (depDt.isAfter(twoWeeks))
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ lên kế hoạch trong 2 tuần tới"));

        // Validate: cách chuyến gần nhất ≥ 2 ngày
        Optional<TrainTrip> lastTrip = tripRepo.findTopByTrainIdOrderByDepartureDatetimeDesc(trainId);
        if (lastTrip.isPresent()) {
            OffsetDateTime lastDep = lastTrip.get().getDepartureDatetime();
            if (Math.abs(lastDep.until(depDt, java.time.temporal.ChronoUnit.HOURS)) < 48)
                return ResponseEntity.badRequest().body(Map.of("message", "Chuyến mới phải cách chuyến gần nhất ít nhất 2 ngày"));
        }

        // Tính arrivalDatetime
        int totalMinutes = tripService.calcTotalDurationMinutes(fromStationId, toStationId);
        if (totalMinutes == 0)
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy dữ liệu thời gian cho tuyến này"));

        OffsetDateTime arrDt = depDt.plusMinutes(totalMinutes);

        // Lấy adminId
        Integer adminId = userRepo.findByEmail(userDetails.getUsername())
                .map(User::getId).orElse(null);

        TrainTrip trip = TrainTrip.builder()
                .train(train)
                .fromStation(fromStation)
                .toStation(toStation)
                .departureDatetime(depDt)
                .arrivalDatetime(arrDt)
                .status("open")
                .createdBy(adminId)
                .build();
        trip = tripRepo.save(trip);

        // Lưu giá
        if (segmentPrices != null) {
            for (Map<String, Object> sp : segmentPrices) {
                Integer spFromId = (Integer) sp.get("fromStationId");
                Integer spToId   = (Integer) sp.get("toStationId");
                String  cType    = (String)  sp.get("carriageType");
                String  berth    = (String)  sp.get("berthPosition");
                Number  priceNum = (Number)  sp.get("price");
                if (priceNum == null || priceNum.longValue() <= 0) continue;

                TrainStation spFrom = stationRepo.findById(spFromId).orElse(null);
                TrainStation spTo   = stationRepo.findById(spToId).orElse(null);
                if (spFrom == null || spTo == null) continue;

                priceRepo.save(TripSegmentPrice.builder()
                        .trip(trip)
                        .fromStation(spFrom)
                        .toStation(spTo)
                        .carriageType(cType)
                        .berthPosition(berth)
                        .price(java.math.BigDecimal.valueOf(priceNum.longValue()))
                        .build());
            }
        }

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId)
                    .action("CREATE_TRIP")
                    .targetType("trip")
                    .targetId(trip.getId())
                    .detail("Tạo chuyến " + train.getTrainCode() + " " + depDt)
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "tripId",  trip.getId(),
                "message", "Đã lên kế hoạch chuyến thành công",
                "arrivalDatetime", arrDt.toString()));
    }

    // ─── CANCEL ───────────────────────────────────────────────────────────────────

    @PutMapping("/{tripId}/cancel")
    @Transactional
    public ResponseEntity<?> cancel(
            @PathVariable Integer tripId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        if (!"open".equals(trip.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("message", "Chỉ hủy được chuyến đang mở"));

        String cancelReason = (String) body.getOrDefault("cancelReason", "Admin hủy");
        Integer adminId = userRepo.findByEmail(userDetails.getUsername())
                .map(User::getId).orElse(null);

        trip.setStatus("cancelled");
        trip.setCancelledBy(adminId);
        trip.setCancelledAt(OffsetDateTime.now());
        trip.setCancelReason(cancelReason);
        tripRepo.save(trip);

        // Cascade cancel: seat_bookings → order_items → orders → payments
        List<SeatBooking> bookings = seatBookingRepo.findByTripIdAndStatus(tripId, "confirmed");
        Set<Integer> orderIds = new HashSet<>();

        for (SeatBooking sb : bookings) {
            sb.setStatus("cancelled");
            seatBookingRepo.save(sb);
        }

        // Cancel tất cả order_items liên quan
        List<OrderItem> items = orderItemRepo.findBySeatBookingTripId(tripId);
        for (OrderItem item : items) {
            item.setStatus("cancelled");
            orderItemRepo.save(item);
            orderIds.add(item.getOrder().getId());
        }

        // Cancel orders và refund payments
        for (Integer orderId : orderIds) {
            orderRepo.findById(orderId).ifPresent(o -> {
                o.setStatus("cancelled");
                orderRepo.save(o);

                // Tạo payment refund
                paymentRepo.findByOrderId(orderId).stream()
                        .filter(p -> "success".equals(p.getStatus()))
                        .forEach(p -> {
                            p.setStatus("refunded");
                            paymentRepo.save(p);
                        });

                // Gửi notification cho khách
                notificationRepo.save(Notification.builder()
                        .userId(o.getCustomer().getId())
                        .title("Chuyến tàu bị hủy")
                        .body("Chuyến " + trip.getTrain().getTrainCode() + " ngày "
                                + trip.getDepartureDatetime().toLocalDate()
                                + " đã bị hủy. Lý do: " + cancelReason
                                + ". Tiền sẽ được hoàn lại.")
                        .notiType("cancellation")
                        .build());
            });
        }

        try {
            adminLogRepo.save(AdminLog.builder()
                    .adminId(adminId)
                    .action("CANCEL_TRIP")
                    .targetType("trip")
                    .targetId(tripId)
                    .detail("Hủy chuyến. Lý do: " + cancelReason)
                    .build());
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "message", "Đã hủy chuyến và hoàn tiền cho " + orderIds.size() + " đơn hàng"));
    }

    // ─── TRIP STATUS (để check trước khi lên kế hoạch mới) ──────────────────────

    @GetMapping("/{tripId}/trip-status")
    public ResponseEntity<?> tripStatus(@PathVariable Integer tripId) {
        TrainTrip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến"));
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trip.getTrain().getId(), "open", OffsetDateTime.now());
        return ResponseEntity.ok(Map.of("hasActiveTrip", hasActive));
    }

    // ─── TRAIN TRIP STATUS (dùng cho admin tàu, check trước khi thêm chuyến mới) ─

    @GetMapping("/train-status/{trainId}")
    public ResponseEntity<?> trainTripStatus(@PathVariable Integer trainId) {
        boolean hasActive = tripRepo.existsByTrainIdAndStatusAndArrivalDatetimeAfter(
                trainId, "open", OffsetDateTime.now());
        Optional<TrainTrip> lastTrip = tripRepo.findTopByTrainIdOrderByDepartureDatetimeDesc(trainId);

        OffsetDateTime now      = OffsetDateTime.now();
        OffsetDateTime earliest = now.plusDays(1);
        OffsetDateTime latest   = now.plusDays(14);

        if (lastTrip.isPresent()) {
            OffsetDateTime lastArr = lastTrip.get().getArrivalDatetime();
            if (lastArr.isAfter(earliest)) earliest = lastArr.plusDays(1);
        }

        return ResponseEntity.ok(Map.of(
                "hasActiveTrip",       hasActive,
                "earliestNewTripDate", earliest.toLocalDate().toString(),
                "latestAllowedDate",   latest.toLocalDate().toString()));
    }

    // ─── CANCEL INFO ──────────────────────────────────────────────────────────────

    @GetMapping("/{tripId}/cancel-info")
    public ResponseEntity<?> cancelInfo(@PathVariable Integer tripId) {
        long affected = seatBookingRepo.findByTripIdAndStatus(tripId, "confirmed").size();
        return ResponseEntity.ok(Map.of("affectedOrders", affected));
    }
}

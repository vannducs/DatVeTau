package com.bookticket.service;

import com.bookticket.dto.ConfirmPaymentRequest;
import com.bookticket.dto.CreateBookingRequest;
import com.bookticket.entity.*;
import com.bookticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final OrderRepository       orderRepository;
    private final OrderItemRepository   orderItemRepository;
    private final PaymentRepository     paymentRepository;
    private final TrainSeatRepository   seatRepository;
    private final TrainTripRepository   tripRepository;
    private final TrainRouteRepository  routeRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final LocationRepository    locationRepository;
    private final UserRepository        userRepository;

    @Transactional
    public String createOrder(CreateBookingRequest req, String userEmail) {
        User customer = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + userEmail));

        TrainTrip trip = tripRepository.findById(req.tripId().intValue())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến: " + req.tripId()));

        Location boardLocation  = locationRepository.findById(req.boardLocationId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ga đi: " + req.boardLocationId()));
        Location alightLocation = locationRepository.findById(req.alightLocationId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ga đến: " + req.alightLocationId()));

        Integer trainId = trip.getTrain().getId();
        TrainRoute boardRoute  = routeRepository.findByTrainIdAndLocationId(trainId, req.boardLocationId())
                .orElseThrow(() -> new RuntimeException("Ga đi không thuộc tuyến tàu"));
        TrainRoute alightRoute = routeRepository.findByTrainIdAndLocationId(trainId, req.alightLocationId())
                .orElseThrow(() -> new RuntimeException("Ga đến không thuộc tuyến tàu"));

        int boardStop  = boardRoute.getStopOrder();
        int alightStop = alightRoute.getStopOrder();

        // Build order
        BigDecimal subtotal    = req.passengers().stream()
                .map(p -> BigDecimal.valueOf(p.ticketPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceFee  = BigDecimal.valueOf(req.serviceFee() != null ? req.serviceFee() : 15_000L);
        BigDecimal totalAmount = subtotal.add(serviceFee);

        String date      = new SimpleDateFormat("MMdd").format(new Date());
        int    rand      = new Random().nextInt(9000) + 1000;
        String orderCode = date + rand;

        Order order = Order.builder()
                .orderCode(orderCode)
                .customer(customer)
                .subtotal(subtotal)
                .serviceFee(serviceFee)
                .discount(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .status("pending_payment")
                .build();
        order = orderRepository.save(order);

        for (CreateBookingRequest.PassengerDto p : req.passengers()) {
            // Conflict check
            long conflicts = seatBookingRepository.countConflicts(
                    p.seatId().intValue(), trip.getId(), boardStop, alightStop);
            if (conflicts > 0) {
                throw new RuntimeException("Ghế " + p.seatNumber() + " đã được đặt cho đoạn này. Vui lòng chọn ghế khác.");
            }

            TrainSeat seat = seatRepository.findById(p.seatId().intValue())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế: " + p.seatId()));

            // Create SeatBooking first (orderItem FK left null initially)
            SeatBooking sb = SeatBooking.builder()
                    .seat(seat)
                    .trip(trip)
                    .boardLocation(boardLocation)
                    .alightLocation(alightLocation)
                    .boardStopOrder(boardStop)
                    .alightStopOrder(alightStop)
                    .ticketPrice(BigDecimal.valueOf(p.ticketPrice()))
                    .status("confirmed")
                    .createdAt(OffsetDateTime.now())
                    .build();
            sb = seatBookingRepository.save(sb);

            // Create OrderItem referencing the SeatBooking
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .seatBooking(sb)
                    .passengerName(p.passengerName())
                    .idNumber(p.idNumber())
                    .phoneNumber(p.phoneNumber())
                    .dateOfBirth(p.dateOfBirth())
                    .ticketPrice(BigDecimal.valueOf(p.ticketPrice()))
                    .status("confirmed")
                    .build();
            item = orderItemRepository.save(item);

            // Link SeatBooking back to OrderItem
            sb.setOrderItem(item);
            seatBookingRepository.save(sb);
        }

        return orderCode;
    }

    @Transactional
    public void confirmPayment(ConfirmPaymentRequest req) {
        Order order = orderRepository.findByOrderCode(req.orderCode())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + req.orderCode()));

        if ("paid".equals(order.getStatus())) return; // idempotent

        order.setStatus("paid");
        orderRepository.save(order);

        Payment payment = Payment.builder()
                .order(order)
                .paymentMethod("VNPay")
                .amount(BigDecimal.valueOf(req.amount()))
                .status("success")
                .transactionCode(req.transactionNo())
                .paidAt(OffsetDateTime.now())
                .build();
        paymentRepository.save(payment);
        // SeatBookings are already 'confirmed' from createOrder — no update needed
    }
}

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
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final TrainSeatRepository trainSeatRepository;
    private final UserRepository userRepository;

    @Transactional
    public String createOrder(CreateBookingRequest req, String userEmail) {
        User customer = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user: " + userEmail));

        BigDecimal subtotal = req.passengers().stream()
                .map(p -> BigDecimal.valueOf(p.ticketPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal serviceFee = BigDecimal.valueOf(15000);
        BigDecimal totalAmount = subtotal.add(serviceFee);

        String date = new SimpleDateFormat("MMdd").format(new Date());
        int rand = new Random().nextInt(9000) + 1000;
        String orderCode = date + rand; // 4 + 4 = 8 ký tự, VNPay sandbox giới hạn 8

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
            TrainSeat seat = trainSeatRepository.findById(p.seatId().intValue())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế: " + p.seatId()));

            if (!"available".equals(seat.getStatus())) {
                throw new RuntimeException("Ghế " + p.seatNumber() + " đã được đặt. Vui lòng chọn ghế khác.");
            }

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .trainSeat(seat)
                    .passengerName(p.passengerName())
                    .idNumber(p.idNumber())
                    .phoneNumber(p.phoneNumber())
                    .dateOfBirth(p.dateOfBirth())
                    .ticketPrice(BigDecimal.valueOf(p.ticketPrice()))
                    .status("confirmed")
                    .build();
            orderItemRepository.save(item);

            seat.setStatus("booked");
            trainSeatRepository.save(seat);
        }

        return orderCode;
    }

    @Transactional
    public void confirmPayment(ConfirmPaymentRequest req) {
        Order order = orderRepository.findByOrderCode(req.orderCode())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + req.orderCode()));

        // Idempotent — nếu đã paid thì bỏ qua
        if ("paid".equals(order.getStatus())) {
            return;
        }

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

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        for (OrderItem item : items) {
            TrainSeat seat = item.getTrainSeat();
            seat.setStatus("booked");
            trainSeatRepository.save(seat);
        }
    }
}

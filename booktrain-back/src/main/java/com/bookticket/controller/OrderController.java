package com.bookticket.controller;

import com.bookticket.dto.OrderSummaryDto;
import com.bookticket.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** GET /api/orders/my-orders — danh sách đơn hàng của user đang đăng nhập */
    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderSummaryDto>> getMyOrders(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(orderService.getMyOrders(email));
    }

    /** GET /api/orders/my-orders/{orderCode} — chi tiết 1 đơn hàng */
    @GetMapping("/my-orders/{orderCode}")
    public ResponseEntity<?> getOrderDetail(
            @PathVariable String orderCode,
            Authentication auth) {

        String email = auth.getName();
        OrderSummaryDto detail = orderService.getOrderDetail(email, orderCode);

        if (detail == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đơn hàng"));
        }
        return ResponseEntity.ok(detail);
    }
}

package com.bookticket.controller;

import com.bookticket.dto.ConfirmPaymentRequest;
import com.bookticket.service.BookingService;
import com.bookticket.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final VNPayService vnPayService;
    private final BookingService bookingService;

    public record CreatePaymentRequest(long amount, String orderCode, String orderInfo) {}

    /**
     * Frontend gọi để lấy URL thanh toán VNPay
     * POST /api/payment/vnpay/create
     */
    @PostMapping("/vnpay/create")
    public ResponseEntity<Map<String, String>> createPayment(
            @RequestBody CreatePaymentRequest req,
            HttpServletRequest httpRequest) {

        String ipAddress = httpRequest.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = httpRequest.getRemoteAddr();
        }

        String paymentUrl = vnPayService.createPaymentUrl(
                req.amount(),
                req.orderCode(),
                req.orderInfo(),
                ipAddress
        );

        Map<String, String> response = new HashMap<>();
        response.put("paymentUrl", paymentUrl);
        return ResponseEntity.ok(response);
    }

    /**
     * VNPay redirect về đây sau khi thanh toán
     * GET /api/payment/vnpay/return  (returnUrl trong application.properties)
     *
     * Flow: VNPay → backend verify + confirmPayment → redirect frontend
     */
    @GetMapping("/vnpay/return")
    public void returnPayment(
            @RequestParam Map<String, String> params,
            HttpServletResponse response) throws IOException {

        String frontendUrl = "http://localhost:5173/trains/payment-return";
        boolean valid        = vnPayService.verifyReturn(params);
        String responseCode  = params.getOrDefault("vnp_ResponseCode", "99");
        String txnRef        = params.getOrDefault("vnp_TxnRef", "");
        String rawAmount     = params.getOrDefault("vnp_Amount", "0");
        String transactionNo = params.getOrDefault("vnp_TransactionNo", "");

        if (valid && "00".equals(responseCode)) {
            long amount = Long.parseLong(rawAmount) / 100;
            try {
                bookingService.confirmPayment(new ConfirmPaymentRequest(
                        txnRef, transactionNo, amount, responseCode
                ));
            } catch (Exception e) {
                System.err.println("[VNPay return] confirmPayment error: " + e.getMessage());
            }
            response.sendRedirect(frontendUrl
                    + "?success=true"
                    + "&orderCode=" + URLEncoder.encode(txnRef, StandardCharsets.UTF_8)
                    + "&amount=" + amount
                    + "&transactionNo=" + URLEncoder.encode(transactionNo, StandardCharsets.UTF_8));
        } else {
            response.sendRedirect(frontendUrl
                    + "?success=false"
                    + "&code=" + URLEncoder.encode(responseCode, StandardCharsets.UTF_8));
        }
    }
}

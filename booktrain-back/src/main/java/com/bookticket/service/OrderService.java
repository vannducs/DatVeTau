package com.bookticket.service;

import com.bookticket.dto.OrderSummaryDto;
import com.bookticket.dto.PassengerSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final JdbcTemplate jdbc;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private static final String ORDER_SQL = """
            SELECT DISTINCT ON (o.id)
                o.id, o.order_code, o.status,
                o.total_amount, o.service_fee, o.created_at,
                tt.departure_time, tt.arrival_time,
                t.train_code, t.train_name,
                l_orig.name AS origin_name,
                l_dest.name AS destination_name,
                p.payment_method, p.transaction_code, p.paid_at
            FROM orders o
            JOIN users u          ON u.id    = o.customer_id
            JOIN order_items oi   ON oi.order_id = o.id
            JOIN train_seats ts   ON ts.id   = oi.train_seat_id
            JOIN train_trips tt   ON tt.id   = ts.trip_id
            JOIN trains t         ON t.id    = tt.train_id
            JOIN locations l_orig ON l_orig.id = tt.origin_id
            JOIN locations l_dest ON l_dest.id = tt.destination_id
            LEFT JOIN payments p  ON p.order_id = o.id
            WHERE u.email = ?
            ORDER BY o.id, o.created_at DESC
            """;

    private static final String ORDER_DETAIL_SQL = """
            SELECT DISTINCT ON (o.id)
                o.id, o.order_code, o.status,
                o.total_amount, o.service_fee, o.created_at,
                tt.departure_time, tt.arrival_time,
                t.train_code, t.train_name,
                l_orig.name AS origin_name,
                l_dest.name AS destination_name,
                p.payment_method, p.transaction_code, p.paid_at
            FROM orders o
            JOIN users u          ON u.id    = o.customer_id
            JOIN order_items oi   ON oi.order_id = o.id
            JOIN train_seats ts   ON ts.id   = oi.train_seat_id
            JOIN train_trips tt   ON tt.id   = ts.trip_id
            JOIN trains t         ON t.id    = tt.train_id
            JOIN locations l_orig ON l_orig.id = tt.origin_id
            JOIN locations l_dest ON l_dest.id = tt.destination_id
            LEFT JOIN payments p  ON p.order_id = o.id
            WHERE u.email = ? AND o.order_code = ?
            ORDER BY o.id
            """;

    private static final String PASSENGER_SQL = """
            SELECT oi.order_id,
                   oi.passenger_name, oi.id_number, oi.ticket_price,
                   ts.seat_number,
                   tc.carriage_number, tc.carriage_type
            FROM orders o
            JOIN users u          ON u.id    = o.customer_id
            JOIN order_items oi   ON oi.order_id = o.id
            JOIN train_seats ts   ON ts.id   = oi.train_seat_id
            JOIN train_carriages tc ON tc.id = ts.carriage_id
            WHERE u.email = ?
            """;

    private static final String PASSENGER_DETAIL_SQL = """
            SELECT oi.order_id,
                   oi.passenger_name, oi.id_number, oi.ticket_price,
                   ts.seat_number,
                   tc.carriage_number, tc.carriage_type
            FROM orders o
            JOIN users u          ON u.id    = o.customer_id
            JOIN order_items oi   ON oi.order_id = o.id
            JOIN train_seats ts   ON ts.id   = oi.train_seat_id
            JOIN train_carriages tc ON tc.id = ts.carriage_id
            WHERE u.email = ? AND o.order_code = ?
            """;

    public List<OrderSummaryDto> getMyOrders(String email) {
        Map<Integer, List<PassengerSummaryDto>> passengerMap = buildPassengerMap(PASSENGER_SQL, email);

        return jdbc.query(ORDER_SQL, rs -> {
            List<OrderSummaryDto> list = new ArrayList<>();
            while (rs.next()) list.add(mapOrder(rs, passengerMap));
            return list;
        }, email);
    }

    public OrderSummaryDto getOrderDetail(String email, String orderCode) {
        Map<Integer, List<PassengerSummaryDto>> passengerMap = buildPassengerMap(PASSENGER_DETAIL_SQL, email, orderCode);

        return jdbc.query(ORDER_DETAIL_SQL, rs -> {
            if (rs.next()) return mapOrder(rs, passengerMap);
            return null;
        }, email, orderCode);
    }

    private Map<Integer, List<PassengerSummaryDto>> buildPassengerMap(String sql, Object... args) {
        Map<Integer, List<PassengerSummaryDto>> map = new LinkedHashMap<>();
        jdbc.query(sql, rs -> {
            int orderId = rs.getInt("order_id");
            map.computeIfAbsent(orderId, k -> new ArrayList<>()).add(new PassengerSummaryDto(
                    rs.getString("passenger_name"),
                    rs.getInt("carriage_number"),
                    rs.getString("seat_number"),
                    rs.getString("carriage_type"),
                    rs.getLong("ticket_price"),
                    rs.getString("id_number")
            ));
        }, args);
        return map;
    }

    private OrderSummaryDto mapOrder(ResultSet rs,
                                     Map<Integer, List<PassengerSummaryDto>> passengerMap)
            throws SQLException {

        int id = rs.getInt("id");
        OffsetDateTime depTime  = rs.getObject("departure_time", OffsetDateTime.class);
        OffsetDateTime arrTime  = rs.getObject("arrival_time",   OffsetDateTime.class);
        OffsetDateTime paidAt   = rs.getObject("paid_at",        OffsetDateTime.class);
        OffsetDateTime created  = rs.getObject("created_at",     OffsetDateTime.class);

        String tripStatus = (depTime != null && depTime.isAfter(OffsetDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))))
                ? "upcoming" : "completed";

        return new OrderSummaryDto(
                rs.getString("order_code"),
                rs.getString("status"),
                tripStatus,
                rs.getLong("total_amount"),
                rs.getLong("service_fee"),
                created  != null ? created.format(FMT) : "",
                rs.getString("train_code"),
                rs.getString("train_name"),
                rs.getString("origin_name"),
                rs.getString("destination_name"),
                depTime  != null ? depTime.format(FMT) : "",
                arrTime  != null ? arrTime.format(FMT) : "",
                rs.getString("payment_method"),
                rs.getString("transaction_code"),
                paidAt   != null ? paidAt.format(FMT)  : null,
                passengerMap.getOrDefault(id, List.of())
        );
    }
}

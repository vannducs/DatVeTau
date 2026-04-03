package com.booktrain.dto;

import lombok.Data;

@Data
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;

    public static <T> ApiResponse<T> ok(T data) {
        return of(true, "Thành công", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return of(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return of(false, message, null);
    }

    public static <T> ApiResponse<T> of(boolean success, String message, T data) {
        ApiResponse<T> res = new ApiResponse<>();
        res.success = success;
        res.message = message;
        res.data = data;
        return res;
    }
}

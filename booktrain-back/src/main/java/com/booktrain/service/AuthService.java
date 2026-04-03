package com.booktrain.service;

import com.booktrain.dto.*;
import com.booktrain.entity.User;
import com.booktrain.repository.UserRepository;
import com.booktrain.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public ApiResponse<AuthResponse> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.error("Email đã được sử dụng");
        }
        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            return ApiResponse.error("Số điện thoại đã được sử dụng");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .enabled(true)
                .build();

        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getEmail());
        AuthResponse authResponse = AuthResponse.of(token, UserResponse.fromEntity(user));
        return ApiResponse.ok("Đăng ký thành công", authResponse);
    }

    public ApiResponse<AuthResponse> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ApiResponse.error("Email hoặc mật khẩu không đúng");
        }

        String token = jwtTokenProvider.generateToken(user.getEmail());
        AuthResponse authResponse = AuthResponse.of(token, UserResponse.fromEntity(user));
        return ApiResponse.ok("Đăng nhập thành công", authResponse);
    }

    public ApiResponse<UserResponse> getCurrentUser(User user) {
        return ApiResponse.ok(UserResponse.fromEntity(user));
    }
}

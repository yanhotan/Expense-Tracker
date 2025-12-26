package com.expensetracker.controller;

import com.expensetracker.dto.ApiResponse;
import com.expensetracker.model.User;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.security.UserPrincipal;
import com.expensetracker.service.DataMigrationService;
import com.expensetracker.service.GoogleAuthService;
import com.expensetracker.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final GoogleAuthService googleAuthService;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final DataMigrationService dataMigrationService;

    public AuthController(GoogleAuthService googleAuthService,
                         UserRepository userRepository,
                         JwtService jwtService,
                         DataMigrationService dataMigrationService) {
        this.googleAuthService = googleAuthService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.dataMigrationService = dataMigrationService;
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<Map<String, String>>> authenticateWithGoogle(@RequestBody Map<String, String> request) {
        try {
            String idToken = request.get("idToken");
            if (idToken == null || idToken.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ID token is required"));
            }

            // Verify Google ID token
            GoogleAuthService.GoogleUserInfo googleUserInfo = googleAuthService.verifyToken(idToken);

            // Find or create user
            User user = userRepository.findByGoogleId(googleUserInfo.getGoogleId())
                .orElseGet(() -> {
                    // Check if user exists by email
                    return userRepository.findByEmail(googleUserInfo.getEmail())
                        .map(existingUser -> {
                            // Update existing user with Google ID
                            existingUser.setGoogleId(googleUserInfo.getGoogleId());
                            existingUser.setPicture(googleUserInfo.getPicture());
                            return userRepository.save(existingUser);
                        })
                        .orElseGet(() -> {
                            // Create new user
                            User newUser = new User();
                            newUser.setEmail(googleUserInfo.getEmail());
                            newUser.setName(googleUserInfo.getName());
                            newUser.setPicture(googleUserInfo.getPicture());
                            newUser.setGoogleId(googleUserInfo.getGoogleId());
                            User savedUser = userRepository.save(newUser);

                            // Migrate demo data to the first user who signs in
                            if (dataMigrationService.needsDemoDataMigration(savedUser)) {
                                dataMigrationService.migrateDemoDataToUser(savedUser);
                            }

                            return savedUser;
                        });
                });

            // Generate JWT token
            String jwtToken = jwtService.generateToken(user);

            Map<String, String> response = new HashMap<>();
            response.put("token", jwtToken);
            response.put("userId", user.getId().toString());
            response.put("email", user.getEmail());
            response.put("name", user.getName());

            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (GeneralSecurityException | java.io.IOException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Invalid Google token: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Authentication failed: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Not authenticated"));
        }

        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail());
        userInfo.put("name", user.getName());
        userInfo.put("picture", user.getPicture());

        return ResponseEntity.ok(ApiResponse.success(userInfo));
    }
}


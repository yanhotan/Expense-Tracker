package com.expensetracker.config;

import com.expensetracker.dto.ApiResponse;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Custom error controller to override Spring Boot's default error handling
 * and ensure our ApiResponse format is used.
 */
@RestController
public class CustomErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<ApiResponse<Void>> handleError(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Object exception = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        Object message = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
        
        System.err.println("🔴 CustomErrorController.handleError called");
        System.err.println("🔴 Status: " + status);
        System.err.println("🔴 Exception: " + exception);
        System.err.println("🔴 Message: " + message);
        
        HttpStatus httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (status != null) {
            try {
                httpStatus = HttpStatus.valueOf(Integer.parseInt(status.toString()));
            } catch (Exception e) {
                // Use default
            }
        }
        
        String errorMessage = "An unexpected error occurred";
        if (exception instanceof Exception) {
            Exception ex = (Exception) exception;
            errorMessage = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            System.err.println("🔴 Exception type: " + ex.getClass().getName());
            System.err.println("🔴 Exception message: " + ex.getMessage());
            ex.printStackTrace();
        } else if (message != null) {
            errorMessage = message.toString();
        }
        
        ApiResponse<Void> response = ApiResponse.error("INTERNAL_ERROR", errorMessage);
        return ResponseEntity.status(httpStatus).body(response);
    }
}


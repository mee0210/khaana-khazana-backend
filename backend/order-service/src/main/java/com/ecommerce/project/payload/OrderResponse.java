package com.ecommerce.project.payload;

import com.ecommerce.project.model.OrderItem;
import com.ecommerce.project.model.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

//Response for the user
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private Long id;
    private String customerName;
    private String userId;
    private String restaurantId;
    private String restaurantName;
    private List<OrderItem> items;
    private BigDecimal totalAmount;
    private PaymentMode paymentMode;
    private Boolean paymentCompleted;
    private String deliveryAddress;
    private String driverName;
    private String driverPhone;
    private String vehicleInfo;
    private Double driverRating;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

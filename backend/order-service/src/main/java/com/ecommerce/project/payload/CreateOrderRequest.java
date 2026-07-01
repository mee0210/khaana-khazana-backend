package com.ecommerce.project.payload;

import com.ecommerce.project.model.OrderItem;
import com.ecommerce.project.model.PaymentMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Restaurant ID is required")
    private String restaurantId;

    @NotBlank(message = "Restaurant name is required")
    private String restaurantName;

    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<OrderItem> items;

    @NotNull(message = "Payment mode is required")
    private PaymentMode paymentMode;

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;
}

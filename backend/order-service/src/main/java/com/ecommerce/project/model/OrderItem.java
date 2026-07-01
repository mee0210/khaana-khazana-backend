package com.ecommerce.project.model;

import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @NotBlank(message = "Item name is required")
    private String itemName;

    @NotNull
    @Positive(message = "Quantity must be greater than zero")
    private Integer quantity;

    @NotNull
    @Positive(message = "Price must be greater than zero")
    private BigDecimal price;
}

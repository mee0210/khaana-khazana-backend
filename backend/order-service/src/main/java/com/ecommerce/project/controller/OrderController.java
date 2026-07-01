package com.ecommerce.project.controller;

import com.ecommerce.project.model.Order;
import com.ecommerce.project.model.OrderStatus;
import com.ecommerce.project.payload.CreateOrderRequest;
import com.ecommerce.project.payload.OrderResponse;
import com.ecommerce.project.payload.UpdateStatusRequest;
import com.ecommerce.project.security.JwtUtils;
import com.ecommerce.project.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final JwtUtils jwtUtils;

    public OrderController(OrderService orderService, JwtUtils jwtUtils) {
        this.orderService = orderService;
        this.jwtUtils = jwtUtils;
    }

    // Creates a new order.
    @Operation(summary = "Create Order")
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        Order savedOrder = orderService.createOrder(request, userId, authHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(savedOrder));
    }

    // Gets a single order by ID.
    @Operation(summary = "Get Order By Id")
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        Order order = orderService.getOrderById(id, userId);
        return ResponseEntity.ok(convertToResponse(order));
    }

    // Get the orders placed by the user
    @Operation(summary = "Get My Orders")
    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        List<Order> orders = orderService.getOrdersByUser(userId);
        return ResponseEntity.ok(orders.stream().map(this::convertToResponse).collect(Collectors.toList()));
    }

    // State update — accepts status as a query param (?status=ACCEPTED)
    @Operation(summary = "Update Order Status")
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
        Order updatedOrder = orderService.transitionStatus(id, orderStatus);
        return ResponseEntity.ok(convertToResponse(updatedOrder));
    }

    // Admin Endpoint
    // Getting All the orders from the system
    @Operation(summary = "Get All Orders")
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders.stream().map(this::convertToResponse).collect(Collectors.toList()));
    }

    private OrderResponse convertToResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerName(order.getCustomerName());
        response.setUserId(order.getUserId());
        response.setRestaurantId(order.getRestaurantId());
        response.setRestaurantName(order.getRestaurantName());
        response.setItems(order.getItems());
        response.setTotalAmount(order.getTotalAmount());
        response.setPaymentMode(order.getPaymentMode());
        response.setPaymentCompleted(order.getPaymentCompleted());
        response.setDeliveryAddress(order.getDeliveryAddress());
        response.setDriverName(order.getDriverName());
        response.setDriverPhone(order.getDriverPhone());
        response.setVehicleInfo(order.getVehicleInfo());
        response.setDriverRating(order.getDriverRating());
        response.setStatus(order.getStatus().toString());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        return response;
    }
}

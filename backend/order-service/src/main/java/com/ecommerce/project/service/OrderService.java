package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.InvalidStatusTransitionException;
import com.ecommerce.project.exceptions.OrderNotFoundException;
import com.ecommerce.project.model.Order;
import com.ecommerce.project.model.OrderStatus;
import com.ecommerce.project.payload.CreateOrderRequest;
import com.ecommerce.project.payload.PaymentRequest;
import com.ecommerce.project.payload.PaymentResponse;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.exceptions.AccessDeniedException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${payment-service.url}")
    private String paymentServiceUrl;

    private static final String NOTIFICATION_TOPIC = "notification_topic";

    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
            OrderStatus.ACCEPTED, Set.of(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED),
            OrderStatus.OUT_FOR_DELIVERY, Set.of(OrderStatus.DELIVERED));

    public OrderService(OrderRepository orderRepository, RestTemplate restTemplate, KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.restTemplate = restTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a new order.
     *
     * @param request
     * @param userId
     * @param authHeader
     * @return
     */
    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public Order createOrder(CreateOrderRequest request, String userId, String authHeader) {
        BigDecimal totalAmount = request.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = new Order();
        order.setCustomerName(request.getCustomerName());
        order.setUserId(userId);
        order.setRestaurantId(request.getRestaurantId());
        order.setRestaurantName(request.getRestaurantName());
        order.setItems(request.getItems());
        order.setTotalAmount(totalAmount);
        order.setPaymentMode(request.getPaymentMode());
        order.setDeliveryAddress(request.getDeliveryAddress());

        // Save order to get ID
        Order savedOrder = orderRepository.save(order);

        // Call Payment Service
        String idempotencyKey = savedOrder.getId().toString() + "-attempt-1";
        PaymentRequest paymentRequest = new PaymentRequest(
                savedOrder.getId().toString(),
                userId,
                totalAmount,
                idempotencyKey
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authHeader);
        headers.set("Content-Type", "application/json");

        HttpEntity<PaymentRequest> entity = new HttpEntity<>(paymentRequest, headers);

        ResponseEntity<PaymentResponse> paymentResponse = restTemplate.exchange(
                paymentServiceUrl,
                HttpMethod.POST,
                entity,
                PaymentResponse.class
        );

        if (paymentResponse.getStatusCode().is2xxSuccessful() && paymentResponse.getBody() != null) {
            String status = paymentResponse.getBody().getStatus();
            if ("SUCCESS".equalsIgnoreCase(status)) {
                savedOrder.setPaymentCompleted(true);
                savedOrder = orderRepository.save(savedOrder);
            }
        }

        // Publish event to Notification Service via Kafka
        try {
            Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("event", "order.created");
            payload.put("orderId", savedOrder.getId().toString());
            payload.put("userId", savedOrder.getUserId());
            payload.put("totalAmount", savedOrder.getTotalAmount());
            payload.put("restaurantName", savedOrder.getRestaurantName());
            payload.put("items", savedOrder.getItems());
            
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(NOTIFICATION_TOPIC, savedOrder.getId().toString(), message);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return savedOrder;
    }

    /**
     * Fallback method if Payment Service is down (Circuit Breaker trips).
     */
    public Order paymentFallback(CreateOrderRequest request, String userId, String authHeader, Throwable throwable) {
        System.err.println("Circuit Breaker Tripped! Payment Service is down. Reason: " + throwable.getMessage());
        
        // The order might have been saved before the exception was thrown if the DB save succeeded
        // but the restTemplate call failed. In a real system, we might query the DB for the recent order.
        // For simplicity, we just save a new one with payment pending.
        
        BigDecimal totalAmount = request.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = new Order();
        order.setCustomerName(request.getCustomerName());
        order.setUserId(userId);
        order.setRestaurantId(request.getRestaurantId());
        order.setRestaurantName(request.getRestaurantName());
        order.setItems(request.getItems());
        order.setTotalAmount(totalAmount);
        order.setPaymentMode(request.getPaymentMode());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setPaymentCompleted(false);
        order.setStatus(OrderStatus.PENDING);

        Order savedOrder = orderRepository.save(order);
        
        // Publish fallback event to Notification Service via Kafka
        try {
            Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("event", "order.created.payment_pending");
            payload.put("orderId", savedOrder.getId().toString());
            payload.put("userId", savedOrder.getUserId());
            payload.put("totalAmount", savedOrder.getTotalAmount());
            payload.put("restaurantName", savedOrder.getRestaurantName());
            payload.put("items", savedOrder.getItems());
            
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(NOTIFICATION_TOPIC, savedOrder.getId().toString(), message);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return savedOrder;
    }

    public Order getOrderById(Long orderId, String userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.getUserId().equals(userId)) {
            throw new AccessDeniedException("You don't own this order");
        }

        return order;
    }

    public List<Order> getOrdersByUser(String userId) {
        return orderRepository.findByUserId(userId);
    }

    public Order transitionStatus(Long id, OrderStatus newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));

        OrderStatus currentStatus = order.getStatus();
        Set<OrderStatus> allowedNextStatuses = VALID_TRANSITIONS.get(currentStatus);

        if (allowedNextStatuses == null || !allowedNextStatuses.contains(newStatus)) {
            throw new InvalidStatusTransitionException(currentStatus.name(), newStatus.name());
        }

        order.setStatus(newStatus);
        return orderRepository.save(order);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }
}

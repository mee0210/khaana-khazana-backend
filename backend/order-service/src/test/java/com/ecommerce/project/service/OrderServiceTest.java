package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.AccessDeniedException;
import com.ecommerce.project.exceptions.InvalidStatusTransitionException;
import com.ecommerce.project.exceptions.OrderNotFoundException;
import com.ecommerce.project.model.Order;
import com.ecommerce.project.model.OrderItem;
import com.ecommerce.project.model.OrderStatus;
import com.ecommerce.project.model.PaymentMode;
import com.ecommerce.project.payload.CreateOrderRequest;
import com.ecommerce.project.payload.PaymentResponse;
import com.ecommerce.project.repositories.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    @InjectMocks
    private OrderService orderService;

    private Order sampleOrder;
    private CreateOrderRequest sampleRequest;

    @BeforeEach
    void setUp() {
        sampleOrder = new Order();
        sampleOrder.setId(1L);
        sampleOrder.setCustomerName("John Doe");
        sampleOrder.setUserId("42");
        sampleOrder.setRestaurantId("10");
        sampleOrder.setRestaurantName("Test Restaurant");
        sampleOrder.setItems(List.of(new OrderItem("Burger", 2, new BigDecimal("150.00"))));
        sampleOrder.setTotalAmount(new BigDecimal("300.00"));
        sampleOrder.setPaymentMode(PaymentMode.CASH);
        sampleOrder.setDeliveryAddress("123 Main Street");
        sampleOrder.setStatus(OrderStatus.PENDING);
        sampleOrder.setPaymentCompleted(false);
        sampleOrder.setCreatedAt(LocalDateTime.now());
        sampleOrder.setUpdatedAt(LocalDateTime.now());

        sampleRequest = new CreateOrderRequest(
                "John Doe",
                "10",
                "Test Restaurant",
                List.of(new OrderItem("Burger", 2, new BigDecimal("150.00"))),
                PaymentMode.CASH,
                "123 Main Street");
    }

    @Test
    @DisplayName("createOrder — should create order with PENDING status and call Payment Service")
    void createOrder_ShouldSetPendingStatus() {
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(1L);
            }
            return saved;
        });

        PaymentResponse mockPaymentResp = new PaymentResponse("txn_1", "1", "SUCCESS", new BigDecimal("300.00"), "1-attempt-1", "Paid");
        when(restTemplate.exchange(any(), eq(HttpMethod.POST), any(), eq(PaymentResponse.class)))
                .thenReturn(new ResponseEntity<>(mockPaymentResp, HttpStatus.OK));

        Order result = orderService.createOrder(sampleRequest, "42", "Bearer dummy-token");

        assertNotNull(result);
        assertEquals("John Doe", result.getCustomerName());
        assertEquals("42", result.getUserId());
        assertEquals("10", result.getRestaurantId());
        assertTrue(result.getPaymentCompleted());
        verify(orderRepository, times(2)).save(any(Order.class));
        verify(kafkaTemplate, times(1)).send(eq("notification_topic"), anyString(), anyString());
    }

    @Test
    @DisplayName("createOrder — should calculate totalAmount correctly for multiple items")
    void createOrder_ShouldCalculateTotalAmount_MultipleItems() {
        CreateOrderRequest multiItemRequest = new CreateOrderRequest(
                "Jane Doe",
                "10",
                "Test Restaurant",
                List.of(
                        new OrderItem("Pizza", 1, new BigDecimal("200.00")),
                        new OrderItem("Coke", 3, new BigDecimal("50.00"))
                ),
                PaymentMode.UPI,
                "456 Side Street");
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(2L);
            }
            return saved;
        });

        PaymentResponse mockPaymentResp = new PaymentResponse("txn_2", "2", "SUCCESS", new BigDecimal("350.00"), "2-attempt-1", "Paid");
        when(restTemplate.exchange(any(), eq(HttpMethod.POST), any(), eq(PaymentResponse.class)))
                .thenReturn(new ResponseEntity<>(mockPaymentResp, HttpStatus.OK));

        Order result = orderService.createOrder(multiItemRequest, "99", "Bearer dummy-token");

        assertEquals(new BigDecimal("350.00"), result.getTotalAmount());
    }

    @Nested
    @DisplayName("Valid Status Transitions")
    class ValidTransitions {

        @Test
        @DisplayName("PENDING → ACCEPTED should succeed")
        void transitionFromPendingToAccepted() {
            sampleOrder.setStatus(OrderStatus.PENDING);
            when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            Order result = orderService.transitionStatus(1L, OrderStatus.ACCEPTED);

            assertEquals(OrderStatus.ACCEPTED, result.getStatus());
            verify(orderRepository).save(sampleOrder);
        }
    }

    @Nested
    @DisplayName("Invalid Status Transitions")
    class InvalidTransitions {

        @Test
        @DisplayName("PENDING → DELIVERED should throw InvalidStatusTransitionException")
        void pendingToDelivered_ShouldThrow() {
            sampleOrder.setStatus(OrderStatus.PENDING);
            when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

            assertThrows(InvalidStatusTransitionException.class,
                    () -> orderService.transitionStatus(1L, OrderStatus.DELIVERED));
            verify(orderRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("transitionStatus — should throw OrderNotFoundException for non-existent order")
    void transitionStatus_OrderNotFound_ShouldThrow() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(OrderNotFoundException.class, () -> orderService.transitionStatus(999L, OrderStatus.ACCEPTED));
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("getOrderById — should throw OrderNotFoundException for non-existent order")
    void getOrderById_OrderNotFound_ShouldThrow() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(OrderNotFoundException.class, () -> orderService.getOrderById(999L, "42"));
    }

    @Test
    @DisplayName("getOrderById — should return order when owner matches")
    void getOrderById_ShouldReturnOrder() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        Order result = orderService.getOrderById(1L, "42");

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("John Doe", result.getCustomerName());
    }

    @Test
    @DisplayName("getOrderById — should throw AccessDeniedException when userId does not match")
    void getOrderById_WrongUser_ShouldThrowAccessDenied() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(sampleOrder));

        assertThrows(AccessDeniedException.class, () -> orderService.getOrderById(1L, "99"));
        verify(orderRepository, never()).save(any());
    }
}

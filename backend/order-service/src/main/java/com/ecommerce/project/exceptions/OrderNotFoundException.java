package com.ecommerce.project.exceptions;

/**
 * Thrown when an order with the given ID does not exist in the database.
 */
public class OrderNotFoundException extends RuntimeException {

    public OrderNotFoundException(String message) {
        super(message);
    }

    public OrderNotFoundException(Long id) {
        super("Order not found with id: " + id);
    }
}

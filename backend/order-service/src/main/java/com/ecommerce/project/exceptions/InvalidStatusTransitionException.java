package com.ecommerce.project.exceptions;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(String message) {
        super(message);
    }

    public InvalidStatusTransitionException(String currentStatus, String newStatus) {
        super("Invalid status transition from " + currentStatus + " to " + newStatus);
    }
}

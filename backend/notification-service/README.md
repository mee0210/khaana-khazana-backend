# Notification Service

This microservice handles asynchronous email and SMS notifications by consuming events from Apache Kafka. It uses Redis for deduplication to ensure exactly-once notification delivery.

## Technologies
- **Python 3.11** + **FastAPI**
- **aiokafka** for asynchronous Kafka consumption
- **redis** for deduplication

## Configuration
Requires `.env` file with:
```env
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
REDIS_URL=redis://redis:6379/0
KAFKA_GROUP_ID=notification-service

# SMTP Configuration for Real Emails
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Features
- **Real SMTP Integration**: Sends real HTML emails.
- **Dynamic HTML Templates**: Renders beautiful UI for emails using Jinja2 (`order_created.html`, `payment_pending.html`, etc.) by extracting `restaurantName` and `items` array from the `order.created` Kafka payload.

## Running
Use `docker-compose up -d --build notification-service` from the root directory to run.

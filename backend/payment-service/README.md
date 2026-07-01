# Payment Service

Payment gateway simulator and idempotency handler for Khaana Khazana.

## Responsibilities

- Idempotent Payment Processing
- Simulating Payment Success (90%) / Failure (10%)
- Simulating Circuit Breaker Failures (for Order Service testing)

## Setup

1. Run `npm install`
2. Create `.env` based on `.env.example`
3. Run `npm run dev` (Runs on port 3002)

## API Contract

The `POST /api/payments` endpoint expects:

```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "amount": 250.00,
  "idempotencyKey": "uuid-or-unique-string"
}
```

Make sure to send `Authorization: Bearer <token>` in the headers.

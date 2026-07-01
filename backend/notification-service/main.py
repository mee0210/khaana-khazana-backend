import asyncio
from fastapi import FastAPI
from kafka_consumer import start_consumer

app = FastAPI(title="Notification Service")

# Store the asyncio task for the consumer
consumer_task = None

@app.on_event("startup")
async def startup_event():
    global consumer_task
    # Start Kafka consumer as a background task
    loop = asyncio.get_event_loop()
    consumer_task = loop.create_task(start_consumer())

@app.on_event("shutdown")
async def shutdown_event():
    global consumer_task
    if consumer_task:
        consumer_task.cancel()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "notification-service"}

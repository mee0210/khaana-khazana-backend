import os
import json
import asyncio
from aiokafka import AIOKafkaConsumer
from redis_client import check_and_set_deduplication
from handlers import process_event

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_GROUP_ID = os.getenv("KAFKA_GROUP_ID", "notification-service")
# Listen to the topics
TOPICS = ["notification_topic", "order-events"]

async def start_consumer():
    consumer = AIOKafkaConsumer(
        *TOPICS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset="earliest"
    )
    
    print(f"🚀 Starting Kafka Consumer for Notification Service on {KAFKA_BOOTSTRAP_SERVERS}...")
    await consumer.start()
    
    try:
        async for msg in consumer:
            print(f"📥 Received message on topic {msg.topic}")
            try:
                payload = json.loads(msg.value.decode('utf-8'))
                
                event_type = payload.get("event")
                status = payload.get("status")
                order_id = payload.get("orderId")
                
                if not event_type and status:
                    # Map generic status to event types based on the project spec
                    if status == "PENDING": event_type = "order.created"
                    elif status == "ACCEPTED": event_type = "order.accepted"
                    elif status == "OUT_FOR_DELIVERY": event_type = "order.statusUpdated"
                    elif status == "DELIVERED": event_type = "order.delivered"
                    elif status == "CANCELLED": event_type = "order.cancelled"
                
                if not event_type or not order_id:
                    print(f"⚠️ Invalid payload format, skipping: {payload}")
                    continue
                
                # Redis deduplication
                is_new = await check_and_set_deduplication(order_id, event_type)
                if not is_new:
                    print(f"♻️ Duplicate event detected for {order_id} - {event_type}, skipping.")
                    continue
                
                # Process event
                await process_event(event_type, payload)
                
            except json.JSONDecodeError:
                print(f"❌ Failed to decode message value: {msg.value}")
            except Exception as e:
                print(f"❌ Error processing message: {str(e)}")
                
    finally:
        print("🛑 Stopping Kafka Consumer...")
        await consumer.stop()

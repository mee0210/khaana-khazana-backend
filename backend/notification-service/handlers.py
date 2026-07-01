import json
import os
import traceback
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

# Set up Jinja2 templates directory
template_dir = os.path.join(os.path.dirname(__file__), "templates")
# Ensure the directory exists
os.makedirs(template_dir, exist_ok=True)
env = Environment(loader=FileSystemLoader(template_dir))

LOGS_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

NOTIFICATIONS_LOG_FILE = os.path.join(LOGS_DIR, "notifications.json")
FAILED_LOG_FILE = os.path.join(LOGS_DIR, "failed_events.json")

def append_to_jsonl(filepath: str, data: dict):
    """Appends a JSON object as a line to the specified file."""
    with open(filepath, "a") as f:
        f.write(json.dumps(data) + "\n")

import smtplib
from email.message import EmailMessage

SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

async def send_email(to: str, subject: str, template_name: str, context: dict):
    """Sends an email using SMTP if configured, else just simulates."""
    try:
        template = env.get_template(template_name)
        html_content = template.render(**context)
        
        # If SMTP is configured, send actual email
        if SMTP_SERVER and SMTP_USERNAME and SMTP_PASSWORD and SMTP_USERNAME != "your-email@gmail.com":
            # Temporary fix: if 'to' is a UUID from the user service instead of an email, 
            # send it to our own SMTP_USERNAME so we can receive the test email
            recipient = to
            if "@" not in recipient:
                print(f"⚠️ 'to' address '{recipient}' is not a valid email (it's a UUID). Sending to {SMTP_USERNAME} instead for testing.")
                recipient = SMTP_USERNAME

            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = f"Khaana Khazana <{SMTP_USERNAME}>"
            msg["To"] = recipient
            msg.add_alternative(html_content, subtype='html')
            
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
            
            print(f"📧 [REAL EMAIL SENT] To: {recipient} | Subject: {subject}")
        else:
            # Simulate Email sending
            print(f"📧 [SIMULATED EMAIL] To: {to} | Subject: {subject}")
            print(f"--- CONTENT START ---\n{html_content}\n--- CONTENT END ---")
        
        return True
    except Exception as e:
        print(f"❌ [EMAIL ERROR] Failed to send email to {to}: {str(e)}")
        traceback.print_exc()
        raise e

async def send_sms(to: str, message: str):
    """Simulates sending an SMS."""
    try:
        print(f"📱 [SMS] To: {to} | Message: {message}")
        return True
    except Exception as e:
        print(f"❌ [SMS ERROR] Failed to send SMS to {to}: {str(e)}")
        raise e

async def handle_order_created(payload: dict):
    # Payload expected: { "event": "order.created", "orderId": "...", "userId": "...", "totalAmount": ... }
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    total_amount = payload.get("totalAmount")
    
    # Simulate sending email + SMS
    context = {
        "order_id": order_id,
        "total_amount": payload.get("totalAmount"),
        "restaurant_name": payload.get("restaurantName", "Khaana Khazana Restaurant"),
        "items": payload.get("items", [])
    }
    await send_email(user_id, f"Order {order_id} placed successfully!", "order_created.html", context)
    await send_sms(user_id, f"Your order {order_id} has been placed successfully. Total: ${total_amount}")
    
    return "email", "sms"

async def handle_order_payment_pending(payload: dict):
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    
    context = {
        "order_id": order_id,
        "total_amount": payload.get("totalAmount"),
        "restaurant_name": payload.get("restaurantName", "Khaana Khazana Restaurant"),
        "items": payload.get("items", [])
    }
    await send_email(user_id, f"Action Required: Order {order_id} payment pending", "payment_pending.html", context)
    
    return "email", None

async def handle_order_accepted(payload: dict):
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    
    context = {
        "order_id": order_id,
        "restaurant_name": payload.get("restaurantName", "Khaana Khazana Restaurant"),
        "items": payload.get("items", [])
    }
    await send_email(user_id, f"Good news! Restaurant accepted your order {order_id}", "order_accepted.html", context)
    
    return "email", None

async def handle_order_out_for_delivery(payload: dict):
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    
    await send_sms(user_id, f"Your order {order_id} is on the way!")
    return None, "sms"

async def handle_order_delivered(payload: dict):
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    
    context = {
        "order_id": order_id,
        "restaurant_name": payload.get("restaurantName", "Khaana Khazana Restaurant"),
        "items": payload.get("items", [])
    }
    await send_email(user_id, f"Order {order_id} delivered! Rate your experience.", "order_delivered.html", context)
    
    return "email", None

async def handle_order_cancelled(payload: dict):
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    
    context = {
        "order_id": order_id,
        "restaurant_name": payload.get("restaurantName", "Khaana Khazana Restaurant"),
        "items": payload.get("items", [])
    }
    await send_email(user_id, f"Order {order_id} cancelled. Refund initiated.", "order_cancelled.html", context)
    await send_sms(user_id, f"Your order {order_id} has been cancelled. Refund initiated.")
    
    return "email", "sms"

async def process_event(event_type: str, payload: dict):
    """Routes the event to the correct handler and logs the notification result."""
    order_id = payload.get("orderId")
    user_id = payload.get("userId")
    timestamp = datetime.utcnow().isoformat()
    
    print(f"🔄 Processing event: {event_type} for Order: {order_id}")
    
    channels = []
    
    try:
        if event_type == "order.created":
            email_c, sms_c = await handle_order_created(payload)
            if email_c: channels.append(email_c)
            if sms_c: channels.append(sms_c)
        elif event_type == "order.created.payment_pending":
            email_c, _ = await handle_order_payment_pending(payload)
            if email_c: channels.append(email_c)
        elif event_type == "order.accepted" or payload.get("status") == "ACCEPTED":
            email_c, _ = await handle_order_accepted(payload)
            if email_c: channels.append(email_c)
        elif event_type == "order.statusUpdated" and payload.get("status") == "OUT_FOR_DELIVERY":
            _, sms_c = await handle_order_out_for_delivery(payload)
            if sms_c: channels.append(sms_c)
        elif event_type == "order.delivered" or payload.get("status") == "DELIVERED":
            email_c, _ = await handle_order_delivered(payload)
            if email_c: channels.append(email_c)
        elif event_type == "order.cancelled" or payload.get("status") == "CANCELLED":
            email_c, sms_c = await handle_order_cancelled(payload)
            if email_c: channels.append(email_c)
            if sms_c: channels.append(sms_c)
        else:
            print(f"⚠️ Unhandled event type: {event_type} (Status: {payload.get('status')})")
            return
        
        # Log successful notifications
        for channel in channels:
            log_entry = {
                "eventId": payload.get("eventId", f"{order_id}-{event_type}"),
                "type": event_type,
                "userId": user_id,
                "sentAt": timestamp,
                "channel": channel,
                "status": "sent"
            }
            append_to_jsonl(NOTIFICATIONS_LOG_FILE, log_entry)
            
    except Exception as e:
        print(f"❌ Error processing event {event_type}: {str(e)}")
        # Log failed events to dead-letter log
        failed_entry = {
            "event": event_type,
            "payload": payload,
            "error": str(e),
            "timestamp": timestamp
        }
        append_to_jsonl(FAILED_LOG_FILE, failed_entry)

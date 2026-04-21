"""
RabbitMQ Producer - Sends messages
"""

import pika
import json
from datetime import datetime

def send_message(queue, message):
    """Send message to RabbitMQ"""
    try:
        # Connect to RabbitMQ
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host='localhost')
        )
        channel = connection.channel()
        
        # Create queue if not exists
        channel.queue_declare(queue=queue, durable=True)
        
        # Add timestamp
        message['timestamp'] = datetime.now().isoformat()
        
        # Send message
        channel.basic_publish(
            exchange='',
            routing_key=queue,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)  # Persistent
        )
        
        connection.close()
        print(f"📤 Sent to {queue}: {message.get('event', 'message')}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send: {e}")
        return False

if __name__ == "__main__":
    # Test
    send_message('job_notifications', {
        'event': 'new_job',
        'job_id': 'JOB-001',
        'title': 'Software Engineer'
    })
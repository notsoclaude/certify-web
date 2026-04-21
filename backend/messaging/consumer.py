import pika
import json
import requests

FLASK_URL = "http://127.0.0.1:5000/api/etl-log"

def start_consumer():
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
        channel = connection.channel()
        
        queues = ['job_notifications', 'application_events']
        
        for queue in queues:
            channel.queue_declare(queue=queue, durable=True)
            
            def callback(ch, method, properties, body):
                try:
                    data = json.loads(body)
                    print(f"\n📥 [{method.routing_key}] {data.get('event')}")
                    
                    # Forward to Flask
                    try:
                        r = requests.post(FLASK_URL, json=data, timeout=5)
                        print(f"   → Flask: {r.status_code}")
                    except Exception as e:
                        print(f"   → Flask error: {e}")
                    
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    
                except Exception as e:
                    print(f"❌ Error: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag)
            
            channel.basic_consume(queue=queue, on_message_callback=callback)
            print(f"👂 Listening: {queue}")
        
        print("\n🚀 Consumer ready (Ctrl+C to stop)")
        channel.start_consuming()
        
    except KeyboardInterrupt:
        print("\n🛑 Stopped")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    start_consumer()
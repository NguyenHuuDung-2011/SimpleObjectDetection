import asyncio
import json
import cv2
import numpy as np
from channels.generic.websocket import AsyncWebsocketConsumer
from ultralytics import YOLO

model = YOLO('yolo11n.pt')

def run_detection(bytes_data):
    try:
        image_data = bytes(bytes_data)
    except Exception:
        image_data = bytes(np.frombuffer(bytes_data, dtype=np.uint8))

    image = np.frombuffer(image_data, dtype=np.uint8)
    frame = cv2.imdecode(image, cv2.IMREAD_COLOR)
    if frame is None:
        print('run_detection: failed to decode image frame')
        return []

    detections = []
    results = model(frame)
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            detections.append({
                'label': label,
                'conf': round(float(box.conf[0]), 3),
                'x': x1,
                'y': y1,
                'width': x2 - x1,
                'height': y2 - y1
            })
    return detections

class CameraConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Client connected")
        self.processing_task = None
        self.processing = False
        await self.accept()

    async def disconnect(self, close_code):
        print("Client disconnected")
        if self.processing_task is not None and not self.processing_task.done():
            self.processing_task.cancel()

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            print(text_data)

        if bytes_data and not self.processing:
            self.processing = True
            self.processing_task = asyncio.create_task(self.handle_frame(bytes_data))

    async def handle_frame(self, bytes_data):
        detections = []
        try:
            detections = await asyncio.to_thread(run_detection, bytes_data)
            await self.send(text_data=json.dumps({'detections': detections}))
        except asyncio.CancelledError:
            print("Frame processing task cancelled")
        except Exception as exc:
            print(f"Detection error: {exc}")
            try:
                await self.send(text_data=json.dumps({'detections': []}))
            except Exception:
                pass
        finally:
            self.processing = False


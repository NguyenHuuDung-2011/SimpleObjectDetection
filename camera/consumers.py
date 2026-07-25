from channels.generic.websocket import AsyncWebsocketConsumer
import json
import cv2
import numpy as np
from ultralytics import YOLO

model = YOLO('yolo11n.pt')

class CameraConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Client connected")
        await self.accept()

    async def disconnect(self, close_code):
        print("Client disconnected")

    async def receive(self, text_data=None, bytes_data=None):
        detections = []
        if text_data:
            print(text_data)
        if bytes_data:
            image = np.frombuffer(bytes_data, dtype=np.uint8)
            frame = cv2.imdecode(image, cv2.IMREAD_COLOR)
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

        print(f"Detections: {detections}")
        await self.send(text_data=json.dumps({'detections': detections}))
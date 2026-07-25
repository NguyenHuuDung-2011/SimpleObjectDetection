from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
import cv2
import numpy as np
from ultralytics import YOLO

model = YOLO('yolo11n.pt')

# Create your views here.
def home(request):
    get_token(request)
    return render(request, 'home.html')

def capture(request):
    detections = []
    if request.method == 'POST':
        if 'image' in request.FILES:
            image = request.FILES['image']
            image = image.read()
            image = np.frombuffer(image, dtype=np.uint8)
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

    return JsonResponse({
        'detections': detections
    })
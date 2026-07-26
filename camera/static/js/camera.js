import { preprocess } from './preprocess.js';
import { classes } from './classes.js';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasContext = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayContext = overlay.getContext('2d');

let session;

async function loadModel() {
    session = await ort.InferenceSession.create('/static/models/yolo11n.onnx', {
        executionProviders: ['webgpu'],
    });
    
    console.log("Model loaded");
}

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    try {
        await video.play();
    } catch (err) {
        console.warn('Video playback was prevented:', err);
    }
}

async function init() {
    await loadModel();
    await startCamera();
}

init();

video.addEventListener('loadedmetadata', async () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    requestAnimationFrame(detect);
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function captureFrame() {
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.6);
    });
}

function drawDetections(detections) {
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    for (const detection of detections) {
        const width = detection.x2 - detection.x1;
        const height = detection.y2 - detection.y1;
        
        overlayContext.strokeStyle = 'red';
        overlayContext.lineWidth = 2;
        overlayContext.strokeRect(detection.x1, detection.y1, width, height);
        
        overlayContext.fillStyle = 'red';
        overlayContext.font = '18px Arial';
        overlayContext.fillText(`${classes[detection.classId]} ${detection.conf.toFixed(2)}`, detection.x1, detection.y1 - 5);
    }
}

function postprocess(output, scale, padX, padY) {
    const data = output.data;
    const numBoxes = output.dims[2];
    const detections = [];
    
    for (let i = 0; i < numBoxes; i++) {
        let bestScore = 0;
        let bestClass = -1;
        
        for (let c = 4; c < 84; c++) {
            
            const score = data[c * numBoxes + i];
            
            if (score > bestScore) {
                
                bestScore = score;
                bestClass = c - 4;
                
            }
            
        }
        
        if (bestScore < 0.5) continue;
        
        const cx = data[i];
        const cy = data[numBoxes + i];
        const w = data[numBoxes * 2 + i];
        const h = data[numBoxes * 3 + i];

        const x1 = (cx - w / 2);
        const y1 = (cy - h / 2);
        const x2 = (cx + w / 2);
        const y2 = (cy + h / 2);

        const rx1 = (x1 - padX) / scale;
        const ry1 = (y1 - padY) / scale;
        const rx2 = (x2 - padX) / scale;
        const ry2 = (y2 - padY) / scale;
        
        detections.push({
            classId: bestClass,
            conf: bestScore,
            x1: rx1,
            y1: ry1,
            x2: rx2,
            y2: ry2
        });
    }
    
    return detections;
}

function iou(a, b) {
    const x1 = Math.max(a.x1, b.x1);
    const y1 = Math.max(a.y1, b.y1);
    
    const x2 = Math.min(a.x2, b.x2);
    const y2 = Math.min(a.y2, b.y2);
    
    const interWidth = Math.max(0, x2 - x1);
    const interHeight = Math.max(0, y2 - y1);
    
    const inter = interWidth * interHeight;
    
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    
    return inter / (areaA + areaB - inter);
}

function nms(detections, threshold = 0.45) {
    detections.sort((a, b) => b.conf - a.conf);
    
    const result = [];
    
    while (detections.length) {
        const best = detections.shift();
        result.push(best);
        
        detections = detections.filter(det => {
            if (det.classId !== best.classId)
                return true;
            return iou(best, det) < threshold;
        });
        
    }
    
    return result;
}

async function detect() {
    const { tensor, scale, padX, padY } = preprocess(video);

    const outputs = await session.run({
        images: tensor
    });

    const output = Object.values(outputs)[0];

    const detections = postprocess(output, scale, padX, padY);

    const finalDetections = nms(detections);

    drawDetections(finalDetections);

    requestAnimationFrame(detect);
}
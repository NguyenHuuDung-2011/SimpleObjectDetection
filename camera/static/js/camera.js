const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasContext = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayContext = overlay.getContext('2d');

video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    
    startDetectionLoop();
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

startCamera();

const socket = new WebSocket('ws://127.0.0.1:8000/ws/camera/');
socket.onopen = () => {
    console.log('WebSocket connection established');
}
socket.onclose = () => {
    console.log('WebSocket connection closed');
}

socket.onerror = (error) => {
    console.error(error);
}

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

async function startDetectionLoop() {
    while (true) {
        const blob = await captureFrame();
        const data = await sendFrame(blob);
        drawDetections(data.detections);
    }
}

function captureFrame() {
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        });
    });
}

async function sendFrame(blob) {
    if (!blob) return;
    
    const formData = new FormData();
    formData.append('image', blob, 'frame.png');
    
    const response = await fetch('/api/frame', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: formData
    });
    return response.json();
}

function drawDetections(detections) {
    overlayContext.clearRect(0, 0, canvas.width, canvas.height);
    for (const detection of detections) {
        
        overlayContext.strokeStyle = 'red';
        overlayContext.lineWidth = 2;
        overlayContext.strokeRect(detection.x, detection.y, detection.width, detection.height);
        
        overlayContext.fillStyle = 'red';
        overlayContext.font = '18px Arial';
        overlayContext.fillText(`${detection.label} ${detection.conf}`, detection.x, detection.y - 5);
    }
}
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

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${window.location.host}/ws/camera/`);

socket.onopen = () => {
    console.log('WebSocket connection established');
    socket.send("Hello VisionEye");
}
socket.onclose = () => {
    console.log('WebSocket connection closed');
}
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    drawDetections(data.detections);
    startDetectionLoop();
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
    if (socket.readyState !== WebSocket.OPEN) return;
    const blob = await captureFrame();
    socket.send(blob);
}

function captureFrame() {
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        });
    });
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
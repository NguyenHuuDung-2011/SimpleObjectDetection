const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasContext = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayContext = overlay.getContext('2d');

let socketReady = false;
let videoReady = false;
let scaleX = 1;
let scaleY = 1;

video.addEventListener('loadedmetadata', () => {
    const captureWidth = 320;
    const captureHeight = Math.round(video.videoHeight * captureWidth / video.videoWidth);
    canvas.width = captureWidth;
    canvas.height = captureHeight;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    scaleX = video.videoWidth / captureWidth;
    scaleY = video.videoHeight / captureHeight;
    videoReady = true;

    if (socketReady) {
        startDetectionLoop();
    }
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    try {
        await video.play();
    } catch (err) {
        console.warn('Video playback was prevented:', err);
    }
}

startCamera();

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const socket = new WebSocket(`${protocol}//${window.location.host}/ws/camera/`);
socket.binaryType = 'arraybuffer';

socket.onopen = () => {
    console.log('WebSocket connection established');
    socketReady = true;
    socket.send("Hello VisionEye");

    if (videoReady) {
        startDetectionLoop();
    }
}
socket.onclose = () => {
    console.log('WebSocket connection closed');
    socketReady = false;
}
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    drawDetections(data.detections);
    startDetectionLoop();
}
socket.onerror = (error) => {
    console.error(error);
}

async function startDetectionLoop() {
    if (socket.readyState !== WebSocket.OPEN || !videoReady) return;
    const blob = await captureFrame();
    if (!blob) {
        console.warn('Failed to capture frame');
        return;
    }
    const buffer = await blob.arrayBuffer();
    console.log('Sending frame', buffer.byteLength, 'bytes');
    socket.send(buffer);
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
        const x = detection.x * scaleX;
        const y = detection.y * scaleY;
        const width = detection.width * scaleX;
        const height = detection.height * scaleY;
        
        overlayContext.strokeStyle = 'red';
        overlayContext.lineWidth = 2;
        overlayContext.strokeRect(x, y, width, height);
        
        overlayContext.fillStyle = 'red';
        overlayContext.font = '18px Arial';
        overlayContext.fillText(`${detection.label} ${detection.conf}`, x, y - 5);
    }
}

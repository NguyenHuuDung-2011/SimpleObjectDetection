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

    setInterval(() => {
        captureFrame();
    }, 100);
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

startCamera();

function captureFrame() {
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
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
        if (!response.ok) {
            console.error(response.status);
            return;
        }
        
        const data = await response.json();
        overlayContext.clearRect(0, 0, canvas.width, canvas.height);
        for (const detection of data.detections) {
            const width = detection.x2 - detection.x1;
            const height = detection.y2 - detection.y1;

            overlayContext.strokeStyle = 'red';
            overlayContext.lineWidth = 2;
            overlayContext.strokeRect(detection.x1, detection.y1, width, height);

            overlayContext.fillStyle = 'red';
            overlayContext.font = '18px Arial';
            overlayContext.fillText(`${detection.class} ${detection.conf}`, detection.x1, detection.y1 - 5);
        }
    });
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
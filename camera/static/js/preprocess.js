const inputSize = 640;
const preprocessCanvas = document.createElement('canvas');
const preprocessContext = preprocessCanvas.getContext('2d');

preprocessCanvas.width = inputSize;
preprocessCanvas.height = inputSize;

export function preprocess(image) {
    const scale = Math.min(
        inputSize / image.videoWidth,
        inputSize / image.videoHeight
    );
    
    const resizedWidth = image.videoWidth * scale;
    const resizedHeight = image.videoHeight * scale;
    
    const padX = (inputSize - resizedWidth) / 2;
    const padY = (inputSize - resizedHeight) / 2;

    preprocessContext.fillStyle = "black";
    preprocessContext.fillRect(0, 0, inputSize, inputSize);
    
    preprocessContext.drawImage(
        image,
        padX,
        padY,
        resizedWidth,
        resizedHeight
    );
    
    const imageData = preprocessContext.getImageData(0, 0, inputSize, inputSize);
    
    const { data } = imageData;
    const tensorData = new Float32Array(3 * inputSize * inputSize);
    
    for (let i = 0; i < inputSize * inputSize; i++) {
        tensorData[i] = data[i * 4] / 255.0;
        tensorData[i + inputSize * inputSize] = data[i * 4 + 1] / 255.0;
        tensorData[i + 2 * inputSize * inputSize] = data[i * 4 + 2] / 255.0;
    }
    
    const tensor = new ort.Tensor('float32', tensorData, [1, 3, inputSize, inputSize]);
    
    return { tensor, scale, padX, padY };
}
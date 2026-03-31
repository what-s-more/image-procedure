let originalImage = null;
let originalImageData = null;
let currentImageData = null;
let basicOperations = { rotate: 0, flipH: false, flipV: false };

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const emptyState = document.getElementById('emptyState');
const previewGrid = document.getElementById('previewGrid');
const bottomBar = document.getElementById('bottomBar');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalInfo = document.getElementById('originalInfo');
const resultInfo = document.getElementById('resultInfo');
const toast = document.getElementById('toast');

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showToast('不支持的文件格式', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            basicOperations = { rotate: 0, flipH: false, flipV: false };

            const ctx = originalCanvas.getContext('2d');
            const maxWidth = 400;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const fullCtx = document.createElement('canvas').getContext('2d');
            fullCtx.canvas.width = img.width;
            fullCtx.canvas.height = img.height;
            fullCtx.drawImage(img, 0, 0);
            originalImageData = fullCtx.getImageData(0, 0, img.width, img.height);
            currentImageData = new ImageData(
                new Uint8ClampedArray(originalImageData.data),
                originalImageData.width,
                originalImageData.height
            );

            originalInfo.textContent = `${file.name} | ${img.width}×${img.height}`;
            resultInfo.textContent = '等待处理...';

            const resultCtx = resultCanvas.getContext('2d');
            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.clearRect(0, 0, width, height);

            emptyState.style.display = 'none';
            previewGrid.style.display = 'flex';
            bottomBar.style.display = 'flex';

            showToast('上传成功', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.querySelectorAll('input[type="range"]').forEach(slider => {
    const valueSpan = document.getElementById(slider.id + 'Value');
    if (valueSpan) {
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            if (slider.id === 'outputQuality') {
                valueSpan.textContent = Math.round(value * 100) + '%';
            } else {
                valueSpan.textContent = value % 1 === 0 ? value : value.toFixed(2);
            }
        });
    }
});

document.getElementById('rotateLeftBtn').addEventListener('click', () => {
    basicOperations.rotate = (basicOperations.rotate - 90 + 360) % 360;
    updateBasicButtonStates();
    showToast('已标记左旋90°', 'info');
});

document.getElementById('rotateRightBtn').addEventListener('click', () => {
    basicOperations.rotate = (basicOperations.rotate + 90) % 360;
    updateBasicButtonStates();
    showToast('已标记右旋90°', 'info');
});

document.getElementById('flipHBtn').addEventListener('click', () => {
    basicOperations.flipH = !basicOperations.flipH;
    updateBasicButtonStates();
    showToast(basicOperations.flipH ? '已标记水平翻转' : '取消水平翻转', 'info');
});

document.getElementById('flipVBtn').addEventListener('click', () => {
    basicOperations.flipV = !basicOperations.flipV;
    updateBasicButtonStates();
    showToast(basicOperations.flipV ? '已标记垂直翻转' : '取消垂直翻转', 'info');
});

function updateBasicButtonStates() {
    document.getElementById('rotateLeftBtn').classList.toggle('active', basicOperations.rotate !== 0);
    document.getElementById('flipHBtn').classList.toggle('active', basicOperations.flipH);
    document.getElementById('flipVBtn').classList.toggle('active', basicOperations.flipV);
}

document.getElementById('applyBasic').addEventListener('click', () => {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }

    if (basicOperations.rotate === 0 && !basicOperations.flipH && !basicOperations.flipV) {
        showToast('请先选择调整操作', 'error');
        return;
    }

    const btn = document.getElementById('applyBasic');
    btn.disabled = true;

    setTimeout(() => {
        try {
            let data = new Uint8ClampedArray(originalImageData.data);
            let width = originalImageData.width;
            let height = originalImageData.height;

            if (basicOperations.rotate === 90 || basicOperations.rotate === 270) {
                [width, height] = [height, width];
            }

            const result = applyBasicOperations(data, originalImageData.width, originalImageData.height, basicOperations);
            currentImageData = new ImageData(result.data, result.width, result.height);

            displayResult({ canvas: createCanvasFromImageData(currentImageData), width: result.width, height: result.height });
            showToast('基础调整完成', 'success');
            
            basicOperations = { rotate: 0, flipH: false, flipV: false };
            updateBasicButtonStates();
        } catch (error) {
            showToast('处理失败: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }, 50);
});

function applyBasicOperations(data, width, height, ops) {
    let result = new Uint8ClampedArray(data);
    let newWidth = width;
    let newHeight = height;

    if (ops.rotate === 90) {
        result = rotate90(result, width, height);
        [newWidth, newHeight] = [height, width];
    } else if (ops.rotate === 180) {
        result = rotate180(result, width, height);
    } else if (ops.rotate === 270) {
        result = rotate270(result, width, height);
        [newWidth, newHeight] = [height, width];
    }

    if (ops.flipH) {
        result = flipHorizontal(result, newWidth, newHeight);
    }
    if (ops.flipV) {
        result = flipVertical(result, newWidth, newHeight);
    }

    return { data: result, width: newWidth, height: newHeight };
}

function rotate90(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = (x * height + (height - 1 - y)) * 4;
            result[dstIdx] = data[srcIdx];
            result[dstIdx + 1] = data[srcIdx + 1];
            result[dstIdx + 2] = data[srcIdx + 2];
            result[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    return result;
}

function rotate180(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((height - 1 - y) * width + (width - 1 - x)) * 4;
            result[dstIdx] = data[srcIdx];
            result[dstIdx + 1] = data[srcIdx + 1];
            result[dstIdx + 2] = data[srcIdx + 2];
            result[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    return result;
}

function rotate270(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((width - 1 - x) * height + y) * 4;
            result[dstIdx] = data[srcIdx];
            result[dstIdx + 1] = data[srcIdx + 1];
            result[dstIdx + 2] = data[srcIdx + 2];
            result[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    return result;
}

function flipHorizontal(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = (y * width + (width - 1 - x)) * 4;
            result[dstIdx] = data[srcIdx];
            result[dstIdx + 1] = data[srcIdx + 1];
            result[dstIdx + 2] = data[srcIdx + 2];
            result[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    return result;
}

function flipVertical(data, width, height) {
    const result = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((height - 1 - y) * width + x) * 4;
            result[dstIdx] = data[srcIdx];
            result[dstIdx + 1] = data[srcIdx + 1];
            result[dstIdx + 2] = data[srcIdx + 2];
            result[dstIdx + 3] = data[srcIdx + 3];
        }
    }
    return result;
}

function createCanvasFromImageData(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

document.getElementById('processPixelArt').addEventListener('click', () => {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }

    const btn = document.getElementById('processPixelArt');
    btn.disabled = true;

    setTimeout(() => {
        try {
            const pixelSize = parseInt(document.getElementById('pixelSize').value);
            const colorReduction = parseInt(document.getElementById('colorReduction').value);
            const scaleFactor = document.getElementById('scaleFactor').value;
            const enhanceMode = document.getElementById('enhanceMode').checked;
            const preserveAspect = document.getElementById('preserveAspect').checked;

            const result = convertToPixelArt(
                currentImageData || originalImageData,
                pixelSize,
                colorReduction,
                scaleFactor ? parseFloat(scaleFactor) : null,
                enhanceMode,
                preserveAspect
            );

            displayResult(result);
            showToast('像素画转换完成', 'success');
        } catch (error) {
            showToast('处理失败: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }, 50);
});

document.getElementById('processEnhance').addEventListener('click', () => {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }

    const btn = document.getElementById('processEnhance');
    btn.disabled = true;

    setTimeout(() => {
        try {
            const sharpness = parseFloat(document.getElementById('sharpness').value);
            const contrast = parseFloat(document.getElementById('contrast').value);
            const saturation = parseFloat(document.getElementById('saturation').value);
            const denoise = document.getElementById('denoise').checked;
            const upscaleFactor = document.getElementById('upscaleFactor').value;

            const result = enhanceImage(
                currentImageData || originalImageData,
                sharpness,
                contrast,
                saturation,
                denoise,
                upscaleFactor ? parseFloat(upscaleFactor) : null
            );

            displayResult(result);
            showToast('画质增强完成', 'success');
        } catch (error) {
            showToast('处理失败: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }, 50);
});

document.getElementById('applyWatermark').addEventListener('click', () => {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }

    const text = document.getElementById('watermarkText').value;
    if (!text) {
        showToast('请输入水印文字', 'error');
        return;
    }

    const position = document.getElementById('watermarkPosition').value;
    const opacity = parseFloat(document.getElementById('watermarkOpacity').value);

    const imageData = currentImageData || originalImageData;
    const result = addWatermark(imageData, text, position, opacity, 24);
    
    currentImageData = new ImageData(result.data, result.width, result.height);
    displayResult({ canvas: createCanvasFromImageData(currentImageData), width: result.width, height: result.height });
    showToast('水印添加完成', 'success');
});

function addWatermark(imageData, text, position, opacity, fontSize) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    ctx.putImageData(imageData, 0, 0);
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
    ctx.lineWidth = 2;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    let x, y;
    const padding = 20;
    
    switch (position) {
        case 'top-left':
            x = padding;
            y = padding + textHeight;
            break;
        case 'top-right':
            x = canvas.width - textWidth - padding;
            y = padding + textHeight;
            break;
        case 'bottom-left':
            x = padding;
            y = canvas.height - padding;
            break;
        case 'bottom-right':
            x = canvas.width - textWidth - padding;
            y = canvas.height - padding;
            break;
        case 'center':
            x = (canvas.width - textWidth) / 2;
            y = canvas.height / 2;
            break;
    }
    
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    
    return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
}

document.getElementById('compressImage').addEventListener('click', () => {
    if (!originalImage) {
        showToast('请先上传图片', 'error');
        return;
    }

    const format = document.getElementById('outputFormat').value;
    const quality = parseFloat(document.getElementById('outputQuality').value);
    
    const imageData = currentImageData || originalImageData;
    const canvas = createCanvasFromImageData(imageData);
    
    let mimeType = 'image/png';
    if (format === 'jpeg') mimeType = 'image/jpeg';
    else if (format === 'webp') mimeType = 'image/webp';
    
    const dataUrl = canvas.toDataURL(mimeType, quality);
    
    const img = new Image();
    img.onload = () => {
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = imageData.width;
        resultCanvas.height = imageData.height;
        const ctx = resultCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const resultData = ctx.getImageData(0, 0, imageData.width, imageData.height);
        currentImageData = resultData;
        
        displayResult({ canvas: resultCanvas, width: imageData.width, height: imageData.height });
        showToast(`已转换为 ${format.toUpperCase()} 格式`, 'success');
    };
    img.src = dataUrl;
});

function convertToPixelArt(imageData, pixelSize, colorReduction, scaleFactor, enhanceMode, preserveAspect) {
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data);

    let targetWidth = pixelSize;
    let targetHeight = pixelSize;

    if (preserveAspect) {
        const aspectRatio = height / width;
        targetHeight = Math.floor(pixelSize * aspectRatio);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d');

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.putImageData(imageData, 0, 0);

    if (enhanceMode) {
        tempCtx.filter = 'contrast(1.1) saturate(1.05)';
    }
    tempCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
    tempCtx.filter = 'none';

    const pixelData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

    if (colorReduction < 256) {
        quantizeColors(pixelData, colorReduction);
    }

    let finalWidth = width;
    let finalHeight = height;
    if (scaleFactor) {
        finalWidth = Math.floor(width * scaleFactor);
        finalHeight = Math.floor(height * scaleFactor);
    }

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = finalWidth;
    resultCanvas.height = finalHeight;
    const resultCtx = resultCanvas.getContext('2d');

    tempCtx.putImageData(pixelData, 0, 0);

    resultCtx.imageSmoothingEnabled = false;
    resultCtx.drawImage(tempCanvas, 0, 0, finalWidth, finalHeight);

    return {
        canvas: resultCanvas,
        width: finalWidth,
        height: finalHeight
    };
}

function quantizeColors(imageData, numColors) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = Math.floor(data[i] / (256 / Math.ceil(Math.sqrt(numColors)))) * (256 / Math.ceil(Math.sqrt(numColors)));
        const g = Math.floor(data[i + 1] / (256 / Math.ceil(Math.sqrt(numColors)))) * (256 / Math.ceil(Math.sqrt(numColors)));
        const b = Math.floor(data[i + 2] / (256 / Math.ceil(Math.sqrt(numColors)))) * (256 / Math.ceil(Math.sqrt(numColors)));

        data[i] = Math.min(255, r);
        data[i + 1] = Math.min(255, g);
        data[i + 2] = Math.min(255, b);
    }
}

function enhanceImage(imageData, sharpness, contrast, saturation, denoise, upscaleFactor) {
    const width = imageData.width;
    const height = imageData.height;
    let data = new Uint8ClampedArray(imageData.data);

    if (denoise) {
        data = applyMedianFilter(data, width, height);
    }

    data = applySharpness(data, width, height, sharpness);

    data = applyContrast(data, contrast);

    data = applySaturation(data, saturation);

    let finalWidth = width;
    let finalHeight = height;
    if (upscaleFactor && upscaleFactor > 1) {
        finalWidth = Math.floor(width * upscaleFactor);
        finalHeight = Math.floor(height * upscaleFactor);
    }

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.putImageData(new ImageData(data, width, height), 0, 0);

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = finalWidth;
    resultCanvas.height = finalHeight;
    const resultCtx = resultCanvas.getContext('2d');

    resultCtx.imageSmoothingEnabled = true;
    resultCtx.imageSmoothingQuality = 'high';
    resultCtx.drawImage(srcCanvas, 0, 0, finalWidth, finalHeight);

    return {
        canvas: resultCanvas,
        width: finalWidth,
        height: finalHeight
    };
}

function applyMedianFilter(data, width, height) {
    const result = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            const neighborsR = [];
            const neighborsG = [];
            const neighborsB = [];

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = Math.min(Math.max(x + dx, 0), width - 1);
                    const ny = Math.min(Math.max(y + dy, 0), height - 1);
                    const nIdx = (ny * width + nx) * 4;
                    neighborsR.push(data[nIdx]);
                    neighborsG.push(data[nIdx + 1]);
                    neighborsB.push(data[nIdx + 2]);
                }
            }

            neighborsR.sort((a, b) => a - b);
            neighborsG.sort((a, b) => a - b);
            neighborsB.sort((a, b) => a - b);

            result[idx] = neighborsR[4];
            result[idx + 1] = neighborsG[4];
            result[idx + 2] = neighborsB[4];
            result[idx + 3] = data[idx + 3];
        }
    }

    return result;
}

function applySharpness(data, width, height, sharpness) {
    if (Math.abs(sharpness - 1.0) < 0.01) return data;

    const result = new Uint8ClampedArray(data);

    if (sharpness > 1) {
        const strength = (sharpness - 1) * 0.5;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                for (let c = 0; c < 3; c++) {
                    const center = data[idx + c];
                    const top = data[((y - 1) * width + x) * 4 + c];
                    const bottom = data[((y + 1) * width + x) * 4 + c];
                    const left = data[(y * width + (x - 1)) * 4 + c];
                    const right = data[(y * width + (x + 1)) * 4 + c];

                    const laplacian = 4 * center - top - bottom - left - right;
                    const sharpened = center + laplacian * strength;

                    result[idx + c] = Math.min(255, Math.max(0, sharpened));
                }
            }
        }
    } else {
        const blurStrength = (1 - sharpness) * 2;
        const radius = Math.max(1, Math.ceil(blurStrength));

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                let r = 0, g = 0, b = 0, totalWeight = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const nIdx = (ny * width + nx) * 4;

                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const weight = Math.exp(-dist * dist / (2 * blurStrength * blurStrength + 0.01));

                        r += data[nIdx] * weight;
                        g += data[nIdx + 1] * weight;
                        b += data[nIdx + 2] * weight;
                        totalWeight += weight;
                    }
                }

                result[idx] = Math.round(r / totalWeight);
                result[idx + 1] = Math.round(g / totalWeight);
                result[idx + 2] = Math.round(b / totalWeight);
            }
        }
    }

    return result;
}

function applyContrast(data, contrast) {
    const simpleFactor = contrast;

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const val = data[i + c];
            const newVal = 128 + (val - 128) * simpleFactor;
            data[i + c] = Math.min(255, Math.max(0, Math.round(newVal)));
        }
    }

    return data;
}

function applySaturation(data, saturation) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;

        data[i] = Math.min(255, Math.max(0, Math.round(gray + saturation * (r - gray))));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(gray + saturation * (g - gray))));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(gray + saturation * (b - gray))));
    }

    return data;
}

function displayResult(result) {
    const maxWidth = 400;
    const maxHeight = 300;
    let displayWidth = result.width;
    let displayHeight = result.height;

    if (displayWidth > maxWidth || displayHeight > maxHeight) {
        const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
        displayWidth = Math.floor(displayWidth * ratio);
        displayHeight = Math.floor(displayHeight * ratio);
    }

    resultCanvas.width = displayWidth;
    resultCanvas.height = displayHeight;

    const ctx = resultCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(result.canvas, 0, 0, displayWidth, displayHeight);

    resultInfo.textContent = `${result.width}×${result.height}`;
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    const format = document.getElementById('downloadFormat').value;
    const canvas = document.createElement('canvas');
    const imageData = currentImageData || originalImageData;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    
    let mimeType = 'image/png';
    let ext = 'png';
    if (format === 'jpeg') {
        mimeType = 'image/jpeg';
        ext = 'jpg';
    } else if (format === 'webp') {
        mimeType = 'image/webp';
        ext = 'webp';
    }
    
    const link = document.createElement('a');
    link.download = `processed_image.${ext}`;
    link.href = canvas.toDataURL(mimeType, 0.95);
    link.click();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    originalImage = null;
    originalImageData = null;
    currentImageData = null;
    basicOperations = { rotate: 0, flipH: false, flipV: false };
    fileInput.value = '';

    const origCtx = originalCanvas.getContext('2d');
    origCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);

    const resCtx = resultCanvas.getContext('2d');
    resCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

    originalInfo.textContent = '--';
    resultInfo.textContent = '--';

    emptyState.style.display = 'flex';
    previewGrid.style.display = 'none';
    bottomBar.style.display = 'none';
    
    updateBasicButtonStates();
});

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast show ' + type;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

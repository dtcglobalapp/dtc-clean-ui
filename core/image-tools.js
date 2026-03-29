export async function prepareSquareImage(file, options = {}) {
  const {
    size = 600,
    type = "image/jpeg",
    quality = 0.88,
    background = "#ffffff",
  } = options;

  if (!file) {
    throw new Error("No image file provided.");
  }

  const imageBitmap = await loadImageBitmap(file);
  const sourceWidth = imageBitmap.width;
  const sourceHeight = imageBitmap.height;

  const cropSize = Math.min(sourceWidth, sourceHeight);
  const sx = Math.max(0, Math.floor((sourceWidth - cropSize) / 2));
  const sy = Math.max(0, Math.floor((sourceHeight - cropSize) / 2));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context.");
  }

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  ctx.drawImage(
    imageBitmap,
    sx,
    sy,
    cropSize,
    cropSize,
    0,
    0,
    size,
    size
  );

  const blob = await canvasToBlob(canvas, type, quality);
  const previewUrl = canvas.toDataURL(type, quality);
  const extension = type === "image/png" ? "png" : "jpg";
  const safeBaseName = String(file.name || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w.-]/g, "")
    .toLowerCase();

  return {
    blob,
    previewUrl,
    fileName: `${safeBaseName || "image"}-${size}x${size}.${extension}`,
    width: size,
    height: size,
    mimeType: type,
  };
}

async function loadImageBitmap(file) {
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }

  return await new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image."));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not convert image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}
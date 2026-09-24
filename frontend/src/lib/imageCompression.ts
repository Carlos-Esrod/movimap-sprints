import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_SIZE_BYTES } from './constants';

export const MAX_INPUT_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
const MAX_DIMENSION = 1600;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const ALLOWED_TYPES = PHOTO_ACCEPTED_TYPES;

function loadAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
      'image/jpeg',
      quality
    );
  });
}

export function isAcceptedImageType(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type);
}

export async function compressImage(file: File): Promise<File> {
  const img = await loadAsImage(file);

  let dimension = MAX_DIMENSION;
  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 8 && quality >= MIN_QUALITY; attempt++, quality -= 0.05) {
    const canvas = drawToCanvas(img, dimension);
    blob = await canvasToJpegBlob(canvas, quality);
    if (blob.size <= PHOTO_MAX_SIZE_BYTES) break;
    dimension = Math.round(dimension * 0.85);
  }

  if (!blob || blob.size > PHOTO_MAX_SIZE_BYTES) {
    throw new Error('La imagen no pudo comprimirse por debajo de 2MB');
  }

  return new File([blob], 'evidencia.jpg', { type: 'image/jpeg' });
}

export async function processImage(file: File): Promise<{ file: File | null; error: string | null }> {
  if (!isAcceptedImageType(file)) {
    return { file: null, error: 'Solo se permiten imágenes JPG, PNG o WebP' };
  }
  if (file.size > MAX_INPUT_SIZE_BYTES) {
    return { file: null, error: 'La imagen no puede superar los 30MB' };
  }

  if (file.size <= PHOTO_MAX_SIZE_BYTES) {
    return { file, error: null };
  }

  try {
    const compressed = await compressImage(file);
    return { file: compressed, error: null };
  } catch {
    return { file: null, error: 'La imagen no pudo comprimirse por debajo de 2MB' };
  }
}

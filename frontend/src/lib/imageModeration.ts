export interface ImageModerationResult {
  blocked: boolean;
  error?: string;
  predictions?: { className: string; probability: number }[];
}

export const MODERATION_PORN_THRESHOLD = 0.6;
export const MODERATION_SEXY_THRESHOLD = 0.8;

let modelPromise: Promise<{ classify: (img: HTMLImageElement) => Promise<{ className: string; probability: number }[]> }> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const nsfwjs = await import('nsfwjs');
      return nsfwjs.load();
    })();
  }
  return modelPromise;
}

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

export async function moderateImage(file: File): Promise<ImageModerationResult> {
  try {
    const model = await getModel();
    const img = await loadAsImage(file);
    const predictions = await model.classify(img);
    const prob: Record<string, number> = {};
    for (const p of predictions) prob[p.className] = p.probability;
    const porn = prob['Porn'] ?? 0;
    const hentai = prob['Hentai'] ?? 0;
    const sexy = prob['Sexy'] ?? 0;
    const blocked = porn > MODERATION_PORN_THRESHOLD || hentai > MODERATION_PORN_THRESHOLD || sexy > MODERATION_SEXY_THRESHOLD;
    return { blocked, predictions };
  } catch (err) {
    console.error('Error al analizar imagen con nsfwjs:', err);
    return { blocked: false, error: 'No se pudo analizar la imagen localmente' };
  }
}

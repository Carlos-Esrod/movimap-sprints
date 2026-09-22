import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_SIZE_BYTES } from '@/lib/constants';
import Icon from '@/components/ui/Icon';

interface EvidenceUploaderProps {
  image: File | null;
  error?: string;
  onChange: (file: File) => void;
  onClear: () => void;
}

function EvidenceUploader({ image, error, onChange, onClear }: EvidenceUploaderProps) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onChange(accepted[0]);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': PHOTO_ACCEPTED_TYPES },
    maxFiles: 1,
    maxSize: PHOTO_MAX_SIZE_BYTES,
  });

  if (image) {
    return (
      <div className="rounded-lg border border-outline-variant overflow-hidden">
        <img src={URL.createObjectURL(image)} alt="Evidencia" className="w-full h-48 object-cover" />
        <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low">
          <span className="text-label-sm text-on-surface-variant truncate">{image.name} ({(image.size / 1024 / 1024).toFixed(2)} MB)</span>
          <button type="button" onClick={onClear} className="text-label-sm text-error font-semibold hover:underline">Quitar</button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
        isDragActive ? 'border-primary bg-surface-container' : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
      }`}
    >
      <input {...getInputProps()} />
      <Icon name="camera" className="text-primary" size={28} />
      <p className="text-label-md font-semibold text-on-surface">Arrastra una foto o haz clic</p>
      <p className="text-label-sm text-on-surface-variant">JPG, PNG o WebP · máx. 2MB</p>
      {error && <p className="text-label-sm text-error font-semibold mt-1">{error}</p>}
    </div>
  );
}

export default EvidenceUploader;

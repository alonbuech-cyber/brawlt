import { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-4 transition-all ${
        dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-gray-600 bg-gray-800/30'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {uploading ? (
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
      ) : (
        <Camera className="w-10 h-10 text-gray-400" />
      )}
      <p className="text-sm text-gray-400 text-center">
        {uploading ? 'Uploading & analyzing...' : 'Tap to upload your Brawl Stars screenshot'}
      </p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading || disabled}
        className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95"
      >
        <Upload className="w-4 h-4" />
        Choose photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

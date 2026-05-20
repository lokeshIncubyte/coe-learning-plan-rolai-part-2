'use client';

import { useState } from 'react';

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/upload', { method: 'POST', body: formData });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor="file-pick">Choose file</label>
      <input
        id="file-pick"
        type="file"
        accept=".pdf,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {isUploading && <span>Processing…</span>}
      <button disabled={!file || isUploading} onClick={handleUpload}>Upload</button>
    </div>
  );
}

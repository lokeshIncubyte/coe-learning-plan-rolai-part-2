'use client';

import { useState } from 'react';

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <label htmlFor="file-pick">Choose file</label>
      <input
        id="file-pick"
        type="file"
        accept=".pdf,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button disabled={!file}>Upload</button>
    </div>
  );
}

'use client';

import { useState } from 'react';

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<{ entityCount: number; edgeCount: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setSummary(null);
    setUploadError(null);
    try {
      const token = localStorage.getItem('accessToken') ?? '';
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        const err = await res.json().catch(() => ({})) as { message?: string };
        setUploadError(err.message ?? `Upload failed (${res.status})`);
      }
    } catch {
      setUploadError('Upload failed — network error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 max-w-lg">
      <div className="flex items-center gap-3 flex-wrap">
        <label
          htmlFor="file-pick"
          className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 transition-colors"
        >
          {file ? file.name : 'Choose file'}
        </label>
        <input
          id="file-pick"
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setSummary(null);
            setUploadError(null);
          }}
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">.pdf or .txt</span>
        <button
          disabled={!file || isUploading}
          onClick={handleUpload}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Upload
        </button>
      </div>
      {isUploading && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Processing…</p>
      )}
      {summary && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          {summary.entityCount} entities, {summary.edgeCount} edges added.
        </p>
      )}
      {uploadError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
      )}
    </div>
  );
}

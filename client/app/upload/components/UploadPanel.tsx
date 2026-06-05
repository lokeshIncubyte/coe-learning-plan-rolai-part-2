'use client';

import { useState } from 'react';

type Mode = 'file' | 'text';
type Summary = { entityCount: number; edgeCount: number };

export function UploadPanel() {
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [loreText, setLoreText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canSubmit = mode === 'file' ? !!file : loreText.trim().length > 0;

  const handleUpload = async () => {
    setIsUploading(true);
    setSummary(null);
    setUploadError(null);
    try {
      const token = localStorage.getItem('accessToken') ?? '';
      const formData = new FormData();
      if (mode === 'file') {
        formData.append('file', file!);
      } else {
        // Wrap the pasted text as a .txt file — server sees identical multipart upload
        formData.append('file', new File([loreText], 'lore.txt', { type: 'text/plain' }));
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        if (mode === 'text') setLoreText('');
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
      {/* Tab toggle */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {(['file', 'text'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSummary(null); setUploadError(null); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-t transition-colors ${
              mode === m
                ? 'bg-white dark:bg-slate-900 border border-b-white dark:border-slate-700 dark:border-b-slate-900 text-indigo-600 dark:text-indigo-400 -mb-px'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {m === 'file' ? 'File upload' : 'Paste text'}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
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
        </div>
      ) : (
        <textarea
          aria-label="Lore text"
          placeholder="Paste lore text here — the extractor will read it and add entities and edges to the graph automatically."
          className="w-full h-40 font-mono text-sm border border-slate-300 dark:border-slate-600 rounded p-2 dark:bg-slate-800 dark:text-slate-100 resize-y"
          value={loreText}
          onChange={(e) => { setLoreText(e.target.value); setSummary(null); setUploadError(null); }}
        />
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={!canSubmit || isUploading}
          onClick={handleUpload}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Processing…' : 'Upload'}
        </button>
        {summary && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {summary.entityCount} entities, {summary.edgeCount} edges added.
          </span>
        )}
        {uploadError && (
          <span className="text-sm text-red-600 dark:text-red-400">{uploadError}</span>
        )}
      </div>
    </div>
  );
}

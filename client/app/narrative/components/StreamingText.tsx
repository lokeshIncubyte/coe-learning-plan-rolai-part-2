export function StreamingText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
      {text}
      {isStreaming && <span data-testid="cursor" className="inline-block w-[0.5ch] ml-0.5 animate-pulse text-indigo-500">▊</span>}
    </p>
  )
}

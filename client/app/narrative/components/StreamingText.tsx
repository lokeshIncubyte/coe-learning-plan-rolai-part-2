export function StreamingText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <span>
      {text}
      {isStreaming && <span data-testid="cursor" className="inline-block animate-pulse">▊</span>}
    </span>
  )
}

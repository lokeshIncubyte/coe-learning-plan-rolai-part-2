// Rough heuristic: ~4 chars per token. Good enough for usage reporting.
export const countTokensRough = (s: string) => Math.max(1, Math.ceil(s.length / 4));

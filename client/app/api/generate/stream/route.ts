export async function POST(request: Request) {
  const body = await request.json()
  const prompt: string = body.prompt ?? ''

  const nestUrl = `http://localhost:3001/api/generate/stream?prompt=${encodeURIComponent(prompt)}`
  const upstream = await fetch(nestUrl)

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

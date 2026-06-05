export async function POST(request: Request) {
  const body = await request.json()
  const auth = request.headers.get('authorization') ?? ''

  const upstream = await fetch('http://localhost:3001/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

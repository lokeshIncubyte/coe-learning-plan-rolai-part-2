export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization') ?? ''
  const upstream = await fetch('http://localhost:3001/api/config/update-spec', {
    headers: { Authorization: authorization },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

export async function PUT(request: Request) {
  const authorization = request.headers.get('Authorization') ?? ''
  const body = await request.json()
  const upstream = await fetch('http://localhost:3001/api/config/update-spec', {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  // NestJS updateSpec returns void on success (empty body) but JSON-serialised errors otherwise.
  // Always use text() to avoid json() throwing on an empty body.
  const text = await upstream.text()
  const data = text ? JSON.parse(text) : {}
  return Response.json(data, { status: upstream.status })
}

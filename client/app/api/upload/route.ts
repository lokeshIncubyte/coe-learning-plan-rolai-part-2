export async function POST(request: Request) {
  const authorization = request.headers.get('Authorization') ?? ''
  const contentType = request.headers.get('Content-Type') ?? ''
  const body = await request.arrayBuffer()
  const upstream = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
    },
    body,
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

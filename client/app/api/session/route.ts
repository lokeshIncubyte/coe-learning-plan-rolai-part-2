export async function GET(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const upstream = await fetch('http://localhost:3001/api/session', {
    headers: { Authorization: auth },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

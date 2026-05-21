export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization') ?? ''
  const upstream = await fetch('http://localhost:3001/api/admin/stats', {
    headers: { Authorization: authorization },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

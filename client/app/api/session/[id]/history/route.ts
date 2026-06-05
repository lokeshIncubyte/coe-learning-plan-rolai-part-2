export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const auth = request.headers.get('Authorization') ?? ''
  const upstream = await fetch('http://localhost:3001/api/session/' + id + '/history', {
    headers: { Authorization: auth },
  })
  const data = await upstream.json()
  return Response.json(data, { status: upstream.status })
}

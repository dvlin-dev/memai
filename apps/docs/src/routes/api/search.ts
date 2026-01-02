import { createFileRoute } from '@tanstack/react-router'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { source } from '@/lib/source'

export const Route = createAPIFileRoute('/api/search')({
  GET: async ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query') ?? ''

    // Simple search implementation
    const results = source.getPages().filter(page =>
      page.data.title.toLowerCase().includes(query.toLowerCase()) ||
      page.data.description?.toLowerCase().includes(query.toLowerCase())
    )

    return Response.json(results.slice(0, 10))
  },
})

import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page'
import { source } from '@/lib/source'
import { baseOptions } from '@/lib/layout.shared'

export const Route = createFileRoute('/docs/$')({
  component: DocsPageComponent,
  loader: ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? []
    const page = source.getPage(slugs)
    if (!page) throw notFound()
    return { page, slugs }
  },
})

function DocsPageComponent() {
  const { page } = Route.useLoaderData()
  const MDX = page.data.body

  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      <DocsPage>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDX />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}

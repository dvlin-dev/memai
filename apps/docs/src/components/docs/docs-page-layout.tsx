import { notFound } from '@tanstack/react-router'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page'
import { source } from '../../lib/source'
import { baseOptions } from '../../lib/layout.shared'
import { getTranslation } from '../../lib/i18n'
import { getMDXComponents } from '../../mdx-components'
import type { Locale } from '../../lib/types'

interface DocsPageLayoutProps {
  slugs: string[]
  locale: Locale
}

export function DocsPageLayout({ slugs, locale }: DocsPageLayoutProps) {
  const page = source.getPage(slugs, locale)
  const t = getTranslation(locale)

  if (!page) {
    throw notFound()
  }

  const MDX = page.data.body

  return (
    <DocsLayout
      tree={source.getPageTree(locale)}
      {...baseOptions(locale)}
      sidebar={{
        collapsible: true,
        defaultOpenLevel: 1,
        banner: (
          <div className="border-b border-border pb-4 mb-4">
            <p className="text-sm text-muted-foreground">{t.sidebarBanner}</p>
          </div>
        ),
      }}
    >
      <DocsPage toc={page.data.toc}>
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.description && <DocsDescription>{page.data.description}</DocsDescription>}
        <DocsBody>
          <MDX components={getMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}

/** Get page metadata for head */
export function getDocsPageMeta(slugs: string[], locale?: Locale) {
  const page = source.getPage(slugs, locale)

  if (!page) {
    return {
      meta: [{ title: 'Not Found | Memokit Docs' }],
    }
  }

  return {
    meta: [
      { title: `${page.data.title} | Memokit Docs` },
      { name: 'description', content: page.data.description },
    ],
  }
}

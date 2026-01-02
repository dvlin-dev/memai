import { Link } from 'react-router-dom'
import { Container } from './Container'
import { Button } from '@memokit/ui/primitives'

const navLinks = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-tight">
              memokit
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/dvlin-dev/memokit"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <a href="https://console.memokit.dev">
              <Button variant="outline" size="sm" className="font-mono">
                Console
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </header>
  )
}

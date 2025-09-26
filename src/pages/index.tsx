import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem('token')
    const rawUser = window.localStorage.getItem('user')
    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser)
        if (user?.role === 'admin') router.replace('/admin')
        else router.replace('/dashboard')
      } catch {}
    }
  }, [router])

  return (
   <div>
  <div className="bg-animated"></div>
  <div className="orb purple"></div>
  <div className="orb cyan"></div>
  <div className="orb rose"></div>

  <div className="container">
    <header className="header fade-up">
      <div className="brand">MyCollab</div>
      <nav className="nav">
        <Link className="button-link secondary" href="/login">Log in</Link>
        <Link className="button-link primary" href="/signup">Sign up</Link>
      </nav>
    </header>

    <section className="hero">
      <h1 className="hero-title fade-up delay-1">Capture, organize, and collaborate.</h1>
      <p className="hero-subtitle fade-up delay-2">Work smarter with boards, tasks, and automation like Trello.</p>
      <div className="hero-actions fade-up delay-3">
        <Link className="button-link primary" href="/signup">Get started</Link>
        <Link className="button-link secondary" href="/login">I already have an account</Link>
      </div>
    </section>

    <section className="section section-muted fade-up">
      <h2 className="section-title">Trusted by modern teams</h2>
      <p className="section-subtitle">From startups to enterprises, MyCollab powers collaboration.</p>
      <div className="logos">
        <div className="logo-tile">Acme</div>
        <div className="logo-tile">Globex</div>
        <div className="logo-tile">Umbrella</div>
        <div className="logo-tile">Initech</div>
        <div className="logo-tile">Hooli</div>
      </div>
    </section>

    <section className="section fade-up">
      <h2 className="section-title">Everything you need to move work forward</h2>
      <p className="section-subtitle">A simple board + card model with powerful upgrades whenever you need them.</p>
      <div className="features">
        <div className="feature">
          <div className="feature-icon icon-blue">📋</div>
          <h3 style={{ margin: 0 }}>Boards & cards</h3>
          <p className="text-muted small" style={{ margin: 0 }}>Break down projects into actionable steps and track progress visually.</p>
        </div>
        <div className="feature">
          <div className="feature-icon icon-green">⚡</div>
          <h3 style={{ margin: 0 }}>Automation</h3>
          <p className="text-muted small" style={{ margin: 0 }}>Automate recurring tasks and keep work flowing without friction.</p>
        </div>
        <div className="feature">
          <div className="feature-icon icon-yellow">🔗</div>
          <h3 style={{ margin: 0 }}>Integrations</h3>
          <p className="text-muted small" style={{ margin: 0 }}>Connect Slack, Google, GitHub, and hundreds more tools.</p>
        </div>
        <div className="feature">
          <div className="feature-icon icon-pink">🔒</div>
          <h3 style={{ margin: 0 }}>Security</h3>
          <p className="text-muted small" style={{ margin: 0 }}>Enterprise-grade security controls for peace of mind.</p>
        </div>
      </div>
    </section>

    <section className="section section-muted fade-up">
      <h2 className="section-title">What customers say</h2>
      <p className="section-subtitle">Real teams, real results.</p>
      <div className="testimonials">
        <div className="quote">
          “MyCollab made our sprint planning effortless and transparent.”
          <cite>— Aisha N., Product Manager</cite>
        </div>
        <div className="quote">
          “We shipped faster once we automated our workflows with MyCollab.”
          <cite>— Daniel R., Engineering Lead</cite>
        </div>
        <div className="quote">
          “Exactly the balance of simplicity and power our team needed.”
          <cite>— Priya S., Operations Director</cite>
        </div>
      </div>
    </section>

    <section className="section fade-up">
      <div className="cta">
        <h3 className="cta-title">Ready to supercharge your team's productivity?</h3>
        <div className="cta-actions">
          <Link className="button-link" href="/signup">Create free account</Link>
          <Link className="button-link secondary" href="/login">Log in</Link>
        </div>
      </div>
    </section>

    <footer className="footer fade-up">
      <div className="footer-grid">
        <div>
          <div className="brand">MyCollab</div>
          <p className="text-muted small" style={{ marginTop: 6 }}>Capture, organize, and collaborate from anywhere.</p>
        </div>
        <div>
          <strong className="small">Product</strong>
          <div><a href="/signup">Pricing</a></div>
          <div><a href="/signup">Changelog</a></div>
          <div><a href="/signup">Docs</a></div>
        </div>
        <div>
          <strong className="small">Company</strong>
          <div><a href="/signup">About</a></div>
          <div><a href="/signup">Careers</a></div>
          <div><a href="/signup">Press</a></div>
        </div>
        <div>
          <strong className="small">Resources</strong>
          <div><a href="/signup">Blog</a></div>
          <div><a href="/signup">Guides</a></div>
          <div><a href="/signup">Support</a></div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 12 }}>© {new Date().getFullYear()} MyCollab, Inc. All rights reserved.</p>
    </footer>
  </div>
   </div>
  );
}

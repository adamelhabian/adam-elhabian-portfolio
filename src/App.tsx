import { useEffect, useRef, useState, useCallback } from 'react'
import resumePdf from '../MYCV.pdf'
import profilePic from '../mypic.jpg'

// ─── Neural Network Canvas ────────────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let mouse = { x: -1000, y: -1000 }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    type Node = { x: number; y: number; vx: number; vy: number; pulse: number }
    const count = 60
    const nodes: Node[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      pulse: Math.random() * Math.PI * 2,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        n.pulse += 0.02
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          n.x -= dx * 0.015
          n.y -= dy * 0.015
        }
      })

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.4
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
            grad.addColorStop(0, `rgba(79, 140, 255, ${alpha})`)
            grad.addColorStop(1, `rgba(168, 85, 247, ${alpha})`)
            ctx.beginPath()
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      nodes.forEach(n => {
        const pulse = 0.5 + 0.5 * Math.sin(n.pulse)
        const r = 2.5 + pulse * 1.5
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3)
        grd.addColorStop(0, `rgba(79, 140, 255, ${0.8 * pulse + 0.2})`)
        grd.addColorStop(1, 'rgba(79, 140, 255, 0)')
        ctx.beginPath()
        ctx.fillStyle = grd
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.fillStyle = `rgba(200, 220, 255, ${0.7 + 0.3 * pulse})`
        ctx.arc(n.x, n.y, r * 0.6, 0, Math.PI * 2)
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

// ─── Tilt Card ────────────────────────────────────────────────────────────────
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`
    el.style.boxShadow = `${x * -20}px ${y * -20}px 40px rgba(79, 140, 255, 0.2), 0 0 40px rgba(168, 85, 247, 0.1)`
  }, [])

  const handleLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)'
    el.style.boxShadow = ''
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt-card ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right')
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('visible'), 80)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function Typewriter({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[idx]
    let timer: ReturnType<typeof setTimeout>
    if (!deleting && displayed.length < current.length) {
      timer = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55)
    } else if (!deleting && displayed.length === current.length) {
      timer = setTimeout(() => setDeleting(true), 2400)
    } else if (deleting && displayed.length > 0) {
      timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30)
    } else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIdx(i => (i + 1) % texts.length)
    }
    return () => clearTimeout(timer)
  }, [displayed, deleting, idx, texts])

  return (
    <span>
      <span className="glow-text" style={{ fontFamily: 'Oxanium, sans-serif' }}>
        {displayed}
      </span>
      <span
        style={{
          display: 'inline-block',
          width: '2px',
          height: '1.1em',
          background: '#4f8cff',
          marginLeft: '2px',
          verticalAlign: 'middle',
          animation: 'blink 1s step-end infinite',
        }}
      />
    </span>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = ['Home', 'About', 'Experience', 'Projects', 'Skills', 'Education', 'Contact']

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(7, 7, 26, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(79, 140, 255, 0.12)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      <span
        style={{
          fontFamily: 'Oxanium, sans-serif',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '0.06em',
        }}
        className="glow-text"
      >
        AE.dev
      </span>

      {/* Desktop links */}
      <div style={{ display: 'flex', gap: '2rem' }} className="hidden md:flex">
        {links.map(l => (
          <a
            key={l}
            href={`#${l.toLowerCase()}`}
            className="nav-link"
          >
            {l}
          </a>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e8eaf6', padding: '4px' }}
        className="md:hidden"
        aria-label="menu"
      >
        <div style={{ width: 22, height: 2, background: '#4f8cff', marginBottom: 5, borderRadius: 1 }} />
        <div style={{ width: 22, height: 2, background: '#a855f7', marginBottom: 5, borderRadius: 1 }} />
        <div style={{ width: 22, height: 2, background: '#06b6d4', borderRadius: 1 }} />
      </button>

      {/* Mobile menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'rgba(7, 7, 26, 0.97)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(79, 140, 255, 0.2)',
            padding: '1rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {links.map(l => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="nav-link"
              style={{ fontSize: '1rem' }}
              onClick={() => setOpen(false)}
            >
              {l}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      id="home"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Neural canvas background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <NeuralCanvas />
      </div>

      {/* Gradient overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 60% at 70% 50%, rgba(79, 140, 255, 0.08) 0%, transparent 70%)',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(to top, #07071a, transparent)',
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '8rem 2rem 4rem',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '4rem',
          alignItems: 'center',
          width: '100%',
        }}
        className="hero-grid"
      >
        {/* Text */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(79, 140, 255, 0.1)',
              border: '1px solid rgba(79, 140, 255, 0.25)',
              borderRadius: '999px',
              padding: '0.35rem 1rem',
              marginBottom: '1.5rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.78rem',
              color: '#4f8cff',
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#4f8cff',
                animation: 'glowPulse 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            Available for opportunities · Mansoura, Egypt
          </div>

          <h1
            style={{
              fontFamily: 'Oxanium, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              marginBottom: '0.4rem',
              color: '#e8eaf6',
            }}
          >
            Adam
            <br />
            <span className="glow-text">Elhabian</span>
          </h1>

          <p
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
              color: '#06b6d4',
              letterSpacing: '0.12em',
              marginBottom: '1.2rem',
              fontWeight: 500,
            }}
          >
            SOFTWARE ENGINEER | BACKEND & AI
          </p>

          <div
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'rgba(232, 234, 246, 0.8)',
              marginBottom: '2.5rem',
              minHeight: '2rem',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 400,
            }}
          >
            <Typewriter
              texts={[
                'Building backend systems and RESTful APIs',
                'Integrating AI and ML into real-world applications',
                'Writing clean, reliable software solutions',
              ]}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#projects" className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              View Projects
            </a>
            <a href="#contact" className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Contact Me
            </a>
            <a
              href={resumePdf}
              download="Adam_Elhabian_Resume.pdf"
              className="btn-outline"
              style={{ borderColor: 'rgba(6, 182, 212, 0.4)', color: '#06b6d4' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Download Resume
            </a>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', alignItems: 'center' }}>
            <a
              href="https://linkedin.com/in/adam-elhabian"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(232, 234, 246, 0.5)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#4f8cff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232, 234, 246, 0.5)')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>
            </a>
            <a
              href="https://github.com/adamelhabian"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(232, 234, 246, 0.5)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#a855f7')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232, 234, 246, 0.5)')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
            </a>
            <a
              href="mailto:elhabianadam16@gmail.com"
              style={{ color: 'rgba(232, 234, 246, 0.5)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#06b6d4')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232, 234, 246, 0.5)')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </a>
          </div>
        </div>

        {/* Avatar card */}
        <div
          style={{ display: 'flex', justifyContent: 'center' }}
          className="hero-avatar"
        >
          <TiltCard>
            <div
              style={{
                width: 'clamp(220px, 28vw, 320px)',
                aspectRatio: '1',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(79, 140, 255, 0.15), rgba(168, 85, 247, 0.15))',
                border: '1px solid rgba(79, 140, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Rotating ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: '26px',
                  background: 'conic-gradient(from 0deg, #4f8cff, #a855f7, #06b6d4, #4f8cff)',
                  opacity: 0.5,
                  animation: 'spinSlow 8s linear infinite',
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 2,
                  borderRadius: '22px',
                  background: '#0d0d2b',
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'center',
                  padding: '2rem',
                }}
              >
                {/* Profile photo */}
                <img
                  src={profilePic}
                  alt="Adam Elhabian"
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    objectFit: 'cover',
                    boxShadow: '0 0 30px rgba(79, 140, 255, 0.4)',
                  }}
                />
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#4f8cff', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>SOFTWARE ENGINEER</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', color: 'rgba(232,234,246,0.6)' }}>Mansoura, Egypt</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['Python', 'FastAPI', 'C++', 'SQL'].map(t => (
                    <span key={t} style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(79, 140, 255, 0.12)',
                      border: '1px solid rgba(79, 140, 255, 0.25)',
                      color: '#4f8cff',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        animation: 'float 2.5s ease-in-out infinite',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'rgba(232,234,246,0.3)', letterSpacing: '0.15em' }}>SCROLL</span>
        <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, rgba(79,140,255,0.6), transparent)' }} />
      </div>
    </section>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────
function About() {
  const stats = [
    { value: '3.55', label: 'GPA / 4.00' },
    { value: '5+', label: 'Projects Built' },
    { value: '6', label: 'Languages' },
    { value: '2+', label: 'Training Programs' },
  ]

  return (
    <section id="about" style={{ padding: '7rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="reveal" style={{ marginBottom: '4rem' }}>
        <SectionLabel>01 — About</SectionLabel>
        <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
          Who I <span className="glow-text">Am</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="about-grid">
        <div className="reveal-left">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(232,234,246,0.75)', marginBottom: '1.5rem' }}>
            Software Engineering student at Mansoura University with hands-on experience building
            backend systems, RESTful APIs, and Machine Learning applications.
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(232,234,246,0.75)', marginBottom: '1.5rem' }}>
            Skilled in Python, C++, JavaScript, and SQL. Experienced with FastAPI, Pandas, Scikit-learn,
            and data-driven development. Completed training programs at DEPI and Huawei ICT.
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(232,234,246,0.75)' }}>
            Seeking a <span style={{ color: '#4f8cff', fontWeight: 600 }}>AI Engineer</span> or <span style={{ color: '#a855f7', fontWeight: 600 }}>Backend Engineer</span> role where
            I can build reliable software and integrate AI into practical solutions.
          </p>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="mailto:elhabianadam16@gmail.com" className="btn-primary" style={{ fontSize: '0.9rem' }}>
              elhabianadam16@gmail.com
            </a>
            <a href="tel:+201015612316" className="btn-outline" style={{ fontSize: '0.9rem' }}>
              +20 1015612316
            </a>
          </div>
        </div>

        <div className="reveal-right" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {stats.map(s => (
            <div
              key={s.label}
              className="glow-border"
              style={{
                background: 'rgba(13, 13, 43, 0.8)',
                borderRadius: '16px',
                padding: '1.75rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 800, fontSize: '2.2rem' }} className="glow-text">
                {s.value}
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', color: 'rgba(232,234,246,0.5)', marginTop: '0.25rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Experience ───────────────────────────────────────────────────────────────
function Experience() {
  const jobs = [
    {
      role: 'Microsoft Machine Learning Engineer Trainee',
      company: 'Digital Egypt Pioneers Initiative (DEPI)',
      period: 'Jul 2026 – Jan 2027',
      color: '#4f8cff',
      bullets: [
        'Developed and evaluated Machine Learning and Deep Learning models using Python, covering data preprocessing, feature engineering, visualization, and model optimization',
        'Gained hands-on experience in NLP, Computer Vision, Transfer Learning, Prompt Engineering, and Generative AI techniques',
        'Applied MLOps practices using MLflow and Hugging Face, while gaining practical experience with Microsoft Azure AI services and completing an end-to-end AI Capstone Project',
      ],
    },
    {
      role: 'HCIA Cloud Computing Trainee',
      company: 'Huawei ICT',
      period: '2026',
      color: '#a855f7',
      bullets: [
        'Gained hands-on knowledge of cloud computing architecture, deployment models, virtualization, and infrastructure technologies, including KVM and Huawei FusionCompute',
        'Developed practical understanding of virtualized compute, networking, and storage, including VM creation, resource management, virtual networks, and storage virtualization',
        'Studied cloud infrastructure management, high availability, security, and emerging technologies such as containers and OpenStack, with practical exposure to Huawei cloud solutions'],
    }

  ]

  return (
    <section id="experience" style={{ padding: '7rem 2rem', background: 'rgba(13,13,43,0.4)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <SectionLabel>02 — Experience</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
            Work <span className="glow-text">Timeline</span>
          </h2>
        </div>

        <div style={{ position: 'relative', paddingLeft: '52px' }}>
          <div className="timeline-line" />
          {jobs.map((job, i) => (
            <div
              key={i}
              className="reveal"
              style={{ position: 'relative', marginBottom: '3rem', transitionDelay: `${i * 0.15}s` }}
            >
              {/* Dot */}
              <div style={{
                position: 'absolute',
                left: -42,
                top: 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: job.color,
                boxShadow: `0 0 16px ${job.color}`,
                border: '2px solid #07071a',
              }} />

              <TiltCard>
                <div
                  className="glow-border"
                  style={{
                    background: 'rgba(13, 13, 43, 0.9)',
                    borderRadius: '16px',
                    padding: '2rem',
                    borderColor: `${job.color}30`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#e8eaf6', marginBottom: '0.2rem' }}>
                        {job.role}
                      </h3>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: job.color, letterSpacing: '0.06em' }}>
                        {job.company}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.75rem',
                      color: 'rgba(232,234,246,0.4)',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {job.period}
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {job.bullets.map((b, j) => (
                      <li key={j} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', fontSize: '0.95rem', color: 'rgba(232,234,246,0.7)', fontFamily: 'Outfit, sans-serif', lineHeight: 1.6 }}>
                        <span style={{ color: job.color, flexShrink: 0, marginTop: '0.4rem', fontSize: '0.5rem' }}>◆</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function Projects() {
  const projects = [
    {
      title: 'User Behavior Analytics',
      subtitle: 'Machine Learning Application',
      desc: 'An end-to-end ML application that analyzes e-commerce user behavior and predicts purchase intent. Built the full workflow from data preprocessing and feature engineering to model training and API-based prediction.',
      tech: ['Python', 'Pandas', 'Scikit-learn', 'FastAPI'],
      accent: '#4f8cff',
      icon: '📊',
      metric: 'End-to-End ML',
    },
    {
      title: 'Password Manager',
      subtitle: 'Secure Credential Management App',
      desc: 'A web application for securely storing and organizing account credentials in one place, making it easier for users to manage and access their passwords and account information.',
      tech: ['Web Application'],
      accent: '#a855f7',
      icon: '🔐',
      metric: 'Full-Stack App',
    },
  ]

  return (
    <section id="projects" style={{ padding: '7rem 2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <SectionLabel>03 — Projects</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
            Featured <span className="glow-text">Work</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {projects.map((p, i) => (
            <div key={i} className="reveal" style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
              <TiltCard className="h-full">
                <div
                  style={{
                    background: 'rgba(13, 13, 43, 0.9)',
                    borderRadius: '16px',
                    padding: '1.75rem',
                    border: `1px solid ${p.accent}25`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${p.accent}55`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${p.accent}25`)}
                >
                  {/* Gradient orb */}
                  <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: p.accent,
                    opacity: 0.06,
                    filter: 'blur(30px)',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                    <div>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>{p.icon}</span>
                      <h3 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#e8eaf6', marginBottom: '0.2rem' }}>
                        {p.title}
                      </h3>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: p.accent, letterSpacing: '0.05em' }}>
                        {p.subtitle}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.7rem',
                      color: p.accent,
                      background: `${p.accent}15`,
                      border: `1px solid ${p.accent}30`,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {p.metric}
                    </span>
                  </div>

                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', color: 'rgba(232,234,246,0.65)', lineHeight: 1.7, marginBottom: '1.5rem', flexGrow: 1 }}>
                    {p.desc}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {p.tech.map(t => (
                      <span key={t} style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.67rem',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(232,234,246,0.5)',
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Skills ───────────────────────────────────────────────────────────────────
function Skills() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.2 }
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const categories = [
    {
      label: 'Languages & Backend',
      color: '#4f8cff',
      items: [
        { name: 'Python', pct: 92 },
        { name: 'FastAPI / REST APIs', pct: 88 },
        { name: 'C++', pct: 85 },
        { name: 'SQL / MS SQL Server', pct: 82 },
        { name: 'JavaScript', pct: 78 },
        { name: 'Git & GitHub', pct: 88 },
      ],
    },
    {
      label: 'AI & Data Science',
      color: '#a855f7',
      items: [
        { name: 'Machine Learning', pct: 90 },
        { name: 'Scikit-learn', pct: 88 },
        { name: 'Pandas & NumPy', pct: 92 },
        { name: 'Data Preprocessing & EDA', pct: 90 },
        { name: 'Feature Engineering', pct: 85 },
        { name: 'Deep Learning', pct: 78 },
      ],
    },
  ]

  const tools = ['Python', 'FastAPI', 'C++', 'JavaScript', 'SQL', 'Microsoft SQL Server', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Git', 'GitHub', 'Jupyter Notebook', 'REST APIs', 'Data Structures & Algorithms']

  return (
    <section id="skills" style={{ padding: '7rem 2rem', background: 'rgba(13,13,43,0.4)' }}>
      <div ref={ref} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <SectionLabel>04 — Skills</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
            Technical <span className="glow-text">Arsenal</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem' }} className="skills-grid">
          {categories.map(cat => (
            <div key={cat.label} className="reveal">
              <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: cat.color, letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
                {cat.label.toUpperCase()}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cat.items.map(item => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', color: 'rgba(232,234,246,0.8)' }}>{item.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: cat.color }}>{item.pct}%</span>
                    </div>
                    <div className="skill-bar">
                      <div
                        className="skill-bar-fill"
                        style={{
                          width: visible ? `${item.pct}%` : '0%',
                          background: `linear-gradient(90deg, ${cat.color}, ${cat.color === '#4f8cff' ? '#06b6d4' : '#06b6d4'})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="reveal">
          <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#06b6d4', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
            TOOLS & TECHNOLOGIES
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {tools.map(t => (
              <span
                key={t}
                className="glow-border"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.8rem',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.06)',
                  color: 'rgba(232,234,246,0.7)',
                  cursor: 'default',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#06b6d4'
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(232,234,246,0.7)'
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.06)'
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Education ────────────────────────────────────────────────────────────────
function Education() {
  const courses = [
    'Object-Oriented Programming',
    'Data Structures & Algorithms',
    'Machine Learning',
    'Deep Learning',
    'Database Systems',
    'Software Engineering',
    'REST APIs',
    'Data Preprocessing',
  ]

  return (
    <section id="education" style={{ padding: '7rem 2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <SectionLabel>05 — Education</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
            Academic <span className="glow-text">Background</span>
          </h2>
        </div>

        <div className="reveal">
          <TiltCard>
            <div
              className="glow-border"
              style={{
                background: 'rgba(13, 13, 43, 0.9)',
                borderRadius: '20px',
                padding: '2.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(#4f8cff, transparent)',
                opacity: 0.08,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3
                    style={{
                      fontFamily: 'Oxanium, sans-serif',
                      fontWeight: 700,
                      fontSize: '1.4rem',
                      color: '#e8eaf6',
                      marginBottom: '0.3rem',
                    }}
                  >
                    B.Sc. in Computer Science - Software Engineering Department
                  </h3>

                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.85rem',
                      color: '#4f8cff',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Mansoura University – Faculty of Computer and Information Sciences
                  </p>

                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.78rem',
                      color: '#8b93a7',
                      margin: 0,
                    }}
                  >
                    Expected Graduation: <span style={{ color: '#e8eaf6' }}>2028</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.75rem',
                    color: 'rgba(232,234,246,0.4)',
                    display: 'block',
                    marginBottom: '0.25rem',
                  }}>2024 – 2028</span>
                  <span style={{
                    fontFamily: 'Oxanium, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                  }} className="glow-text">3.55 GPA</span>
                </div>
              </div>
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'rgba(232,234,246,0.4)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  RELEVANT COURSEWORK & FOCUS AREAS
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {courses.map(c => (
                    <span key={c} style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '0.8rem',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: 'rgba(79, 140, 255, 0.1)',
                      border: '1px solid rgba(79, 140, 255, 0.2)',
                      color: 'rgba(232,234,246,0.7)',
                    }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  )
}

// ─── Certifications ───────────────────────────────────────────────────────────
function Certifications() {
  const certs = [
    { title: 'Git & GitHub Certificate', org: 'Coursera', icon: '🎓', color: '#4f8cff' },
    { title: 'Machine Learning Track Trainee', org: 'DEPI', icon: '🤖', color: '#a855f7' },
    { title: 'Cloud Computing Trainee', org: 'Huawei ICT', icon: '☁️', color: '#06b6d4' },
  ]

  return (
    <section style={{ padding: '7rem 2rem', background: 'rgba(13,13,43,0.4)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem' }}>
          <SectionLabel>06 — Certifications & Training</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#e8eaf6' }}>
            Credentials & <span className="glow-text">Training</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {certs.map((c, i) => (
            <div key={i} className="reveal" style={{ transitionDelay: `${(i % 3) * 0.08}s` }}>
              <TiltCard>
                <div
                  style={{
                    background: 'rgba(13, 13, 43, 0.9)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    border: `1px solid ${c.color}20`,
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${c.color}50`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${c.color}20`)}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '10px',
                    background: `${c.color}15`,
                    border: `1px solid ${c.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}>
                    {c.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: '#e8eaf6', marginBottom: '0.2rem' }}>
                      {c.title}
                    </p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: c.color }}>
                      {c.org}
                    </p>
                  </div>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    setForm({ name: '', email: '', message: '' })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(13, 13, 43, 0.8)',
    border: '1px solid rgba(79, 140, 255, 0.2)',
    borderRadius: '10px',
    padding: '0.875rem 1rem',
    color: '#e8eaf6',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <section id="contact" style={{ padding: '7rem 2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <SectionLabel>07 — Contact</SectionLabel>
          <h2 style={{ fontFamily: 'Oxanium, sans-serif', fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#e8eaf6', marginBottom: '1rem' }}>
            Let's Build Something <span className="glow-text">Together</span>
          </h2>
          <p style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(232,234,246,0.6)', fontSize: '1.05rem' }}>
            Open for Software Engineer, Backend, and AI roles. Let's connect.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }} className="contact-grid">
          {/* Info */}
          <div className="reveal-left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { icon: '✉', label: 'Email', val: 'elhabianadam16@gmail.com', href: 'mailto:elhabianadam16@gmail.com', color: '#4f8cff' },
                { icon: '📞', label: 'Phone', val: '+20 1015612316', href: 'tel:+201015612316', color: '#a855f7' },
                { icon: '📍', label: 'Location', val: 'Mansoura, Egypt', href: '#', color: '#06b6d4' },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    background: 'rgba(13, 13, 43, 0.8)',
                    borderRadius: '12px',
                    border: `1px solid ${item.color}20`,
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${item.color}50`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${item.color}20`)}
                >
                  <span style={{ fontSize: '1.2rem', width: 28, textAlign: 'center' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: item.color, letterSpacing: '0.08em', marginBottom: '0.1rem' }}>{item.label.toUpperCase()}</p>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', color: 'rgba(232,234,246,0.8)' }}>{item.val}</p>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="https://linkedin.com/in/adam-elhabian" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                LinkedIn
              </a>
              <a href="https://github.com/adamelhabian" target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: '0.85rem' }}>
                GitHub
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="reveal-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.2)')}
              />
              <input
                type="email"
                placeholder="Your Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.2)')}
              />
              <textarea
                placeholder="Your Message"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                required
                rows={5}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(79, 140, 255, 0.2)')}
              />
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', fontSize: '1rem' }}>
                {sent ? '✓ Message Sent!' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(79, 140, 255, 0.12)',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'rgba(232,234,246,0.3)', letterSpacing: '0.08em' }}>
        © 2026 · Adam Ahmed Elhabian · Software Engineer · Mansoura, Egypt
      </p>
    </footer>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.75rem',
      color: '#4f8cff',
      letterSpacing: '0.18em',
      marginBottom: '0.75rem',
    }}>
      {children as string}
    </p>
  )
}

// ─── Responsive styles injection ──────────────────────────────────────────────
function ResponsiveStyle() {
  return (
    <style>{`
      @media (max-width: 768px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .hero-avatar { display: none !important; }
        .about-grid { grid-template-columns: 1fr !important; }
        .skills-grid { grid-template-columns: 1fr !important; }
        .contact-grid { grid-template-columns: 1fr !important; }
        .hidden { display: none !important; }
        .md\\:flex { display: flex !important; }
      }
      @media (min-width: 769px) {
        .md\\:hidden { display: none !important; }
        .md\\:flex { display: flex !important; }
      }
    `}</style>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  useReveal()

  return (
    <>
      <ResponsiveStyle />
      <Nav />
      <main>
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Education />
        <Certifications />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

import { useNavigate } from 'react-router-dom'
import MenuCard from '../components/MenuCard'
import '../styles/home.css'

function Home({ systemHealth }) {
  const navigate = useNavigate()

  // Job Seeker menu items only
  const menuItems = [
    {
      id: 'browse',
      title: 'Browse Jobs',
      description: 'Explore thousands of entry-level positions from top employers',
      icon: '🔍',
      color: '#2563eb',
      path: '/jobs',
      stats: systemHealth.database === 'connected' ? 'Live Database' : '1,240+ Jobs Available',
      connection: 'PostgreSQL via REST API'
    },
    {
      id: 'dashboard',
      title: 'My Dashboard',
      description: 'Track your applications, saved jobs, and profile status',
      icon: '📊',
      color: '#10b981',
      path: '/dashboard',
      stats: '3 Active Applications',
      connection: 'Real-time API'
    },
    {
      id: 'resume',
      title: 'Upload Resume',
      description: 'Get your resume certified and visible to recruiters',
      icon: '📄',
      color: '#f59e0b',
      path: '/dashboard',
      stats: 'Profile 85% Complete',
      connection: 'File system + Database'
    },
    {
      id: 'etl',
      title: 'ETL Pipeline',
      description: 'View data transformation: XML → JSON → Database',
      icon: '🔄',
      color: '#8b5cf6',
      path: '/system',
      stats: systemHealth.etl === 'ready' ? 'Pipeline Active' : 'Click to Setup',
      connection: 'XML → JSON → PostgreSQL'
    },
    {
      id: 'messaging',
      title: 'Message Queue',
      description: 'System notifications and async processing',
      icon: '🔔',
      color: '#ef4444',
      path: '/system',
      stats: systemHealth.messaging === 'standby' ? 'RabbitMQ Ready' : 'Connecting...',
      connection: 'Producer/Consumer Pattern'
    },
    
  ]

  // Quick actions for job seekers
  const quickActions = [
    { label: 'Full-time Jobs', count: '856', path: '/jobs?type=full-time' },
    { label: 'Internships', count: '324', path: '/jobs?type=internship' },
    { label: 'Part-time', count: '180', path: '/jobs?type=part-time' },
    { label: 'Remote', count: '420', path: '/jobs?location=remote' }
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Career. Explore. Ready. Talent.</h1>
          <p className="hero-subtitle">Your gateway to professional success. Get certified, get hired.</p>
          
          <div className="integration-badge">
            <span className={`status-indicator ${systemHealth.api === 'online' ? 'online' : 'offline'}`}></span>
            <span>IT 324 - System Integration & Architecture</span>
            <span className="tech-stack">Flask + React + PostgreSQL + RabbitMQ</span>
          </div>
          
          <div className="quick-search">
            <input type="text" placeholder="Job title, keywords, or company" className="search-input" />
            <input type="text" placeholder="Location" className="location-input" />
            <button className="search-btn" onClick={() => navigate('/jobs')}>Search Jobs</button>
          </div>

          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <button key={index} className="action-pill" onClick={() => navigate(action.path)}>
                <span>{action.label}</span>
                <span className="count">{action.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Grid */}
      <section className="menu-section">
        <h2 className="section-title">What would you like to do?</h2>
        <p className="section-subtitle">Powered by ETL Pipeline, REST API, and Message Queue Architecture</p>
        <div className="menu-grid">
          {menuItems.map((item) => (
            <MenuCard key={item.id} {...item} onClick={() => navigate(item.path)} />
          ))}
        </div>
      </section>

      {/* Data Flow Visualization */}
      <section className="data-flow-section">
        <h2 className="section-title">System Architecture</h2>
        <div className="flow-diagram">
          <div className="flow-box"><span className="flow-icon">📄</span><span>Legacy XML</span></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span className="flow-icon">🔄</span><span>ETL Pipeline</span><small>xml_to_json.py</small></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span className="flow-icon">📋</span><span>JSON</span><small>json_to_db.py</small></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span className="flow-icon">🗄️</span><span>PostgreSQL</span><small>Database</small></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span className="flow-icon">⚛️</span><span>React Frontend</span><small>REST API</small></div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="featured-section">
        <div className="featured-card">
          <div className="featured-content">
            <span className="badge">New Feature</span>
            <h3>Virtual Job Fair 2026</h3>
            <p>Connect with 50+ employers online. Live chat, instant interviews, and on-the-spot offers!</p>
            <button className="featured-btn" onClick={() => navigate('/jobs')}>Register Now →</button>
          </div>
          <div className="featured-visual"><span className="emoji">🎪</span></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item"><span className="stat-number">5,000+</span><span className="stat-label">Jobs Posted</span></div>
        <div className="stat-item"><span className="stat-number">1,200+</span><span className="stat-label">Employers</span></div>
        <div className="stat-item"><span className="stat-number">8,500+</span><span className="stat-label">Successful Hires</span></div>
        <div className="stat-item"><span className="stat-number">95%</span><span className="stat-label">Placement Rate</span></div>
      </section>
    </div>
  )
}

export default Home
import { useNavigate } from 'react-router-dom'
import MenuCard from '../components/MenuCard'
import '../styles/home.css'

function HomeEmployer({ systemHealth }) {
  const navigate = useNavigate()

  // ✅ FIXED: Added proper slashes to all paths
  const menuItems = [
    {
      id: 'post-job',
      title: 'Post a Job',
      description: 'Create job listings and attract candidates',
      icon: '➕',
      color: '#2563eb',
      path: '/employer/post-job',  // ✅ FIXED: was '/employerpost-job'
      stats: 'Quick Posting',
      connection: 'Employer API'
    },
    {
      id: 'my-jobs',
      title: 'My Jobs',
      description: 'Manage your active job postings',
      icon: '💼',
      color: '#10b981',
      path: '/employer/job',  // ✅ FIXED: was '/employerjob'
      stats: 'Live Listings',
      connection: 'Database Sync'
    },
    {
      id: 'candidates',
      title: 'Candidates',
      description: 'View applicants and resumes',
      icon: '👥',
      color: '#f59e0b',
      path: '/employer/candidates',  // ✅ FIXED: was '/employercandidates'
      stats: 'Real-time Applicants',
      connection: 'Application API'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Track hiring performance',
      icon: '📊',
      color: '#8b5cf6',
      path: '/dashboard',  // ✅ FIXED: was '/pages/EmployerDashboard'
      stats: 'Hiring Insights',
      connection: 'Analytics Engine'
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
      stats: systemHealth.messaging === 'standby'
        ? 'RabbitMQ Ready'
        : 'Connecting...',
      connection: 'Producer/Consumer Pattern'
    }
  ]

  const quickActions = [
    { label: 'Active Jobs', count: '12', path: '/employer/job' },  // ✅ FIXED
    { label: 'Applicants', count: '85', path: '/employer/candidates' },  // ✅ FIXED
    { label: 'Interviews', count: '6', path: '/dashboard' },
    { label: 'Hired', count: '3', path: '/dashboard' }
  ]

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Hire. Manage. Grow. Talent.</h1>
          <p className="hero-subtitle">
            Your hiring control center. Post jobs, manage candidates, and track performance.
          </p>

          <div className="integration-badge">
            <span className={`status-indicator ${systemHealth.api === 'online' ? 'online' : 'offline'}`}></span>
            <span>Employer System Panel</span>
            <span className="tech-stack">Flask + React + PostgreSQL</span>
          </div>

          <div className="quick-actions">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="action-pill"
                onClick={() => navigate(action.path)}
              >
                <span>{action.label}</span>
                <span className="count">{action.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="menu-section">
        <h2 className="section-title">Employer Tools</h2>
        <p className="section-subtitle">
          Manage jobs, applicants, and hiring performance
        </p>

        <div className="menu-grid">
          {menuItems.map((item) => (
            <MenuCard
              key={item.id}
              {...item}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </section>

      <section className="data-flow-section">
        <h2 className="section-title">System Architecture</h2>
        <div className="flow-diagram">
          <div className="flow-box"><span>📄</span><span>Job Data</span></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span>🔄</span><span>API Layer</span></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span>🗄️</span><span>Database</span></div>
          <span className="flow-arrow">→</span>
          <div className="flow-box"><span>⚛️</span><span>Frontend</span></div>
        </div>
      </section>

      <section className="featured-section">
        <div className="featured-card">
          <div className="featured-content">
            <span className="badge">Employer Feature</span>
            <h3>Smart Candidate Matching</h3>
            <p>
              Automatically match candidates to your job postings using intelligent filters.
            </p>
            <button
              className="featured-btn"
              onClick={() => navigate('/employer/candidates')}  // ✅ FIXED
            >
              View Candidates →
            </button>
          </div>
          <div className="featured-visual">
            <span className="emoji">🤝</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomeEmployer
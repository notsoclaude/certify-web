import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/dashboard.css'

const API_BASE_URL = 'http://127.0.0.1:5000'

function Dashboard({ systemHealth }) {
  const [applications, setApplications] = useState([])
  const [savedJobs, setSavedJobs] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    accepted: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()
  const { getToken, user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = getToken()
      
      if (!token) {
        setError('Please log in to view your dashboard')
        setLoading(false)
        return
      }

      // Fetch saved jobs
      const savedRes = await fetch(`${API_BASE_URL}/api/saved-jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let savedJobsList = []
      if (savedRes.ok) {
        const savedData = await savedRes.json()
        if (savedData?.data?.saved_jobs && Array.isArray(savedData.data.saved_jobs)) {
          savedJobsList = savedData.data.saved_jobs
        }
      }
      setSavedJobs(savedJobsList)

      // Fetch applications
      const appsRes = await fetch(`${API_BASE_URL}/api/my-applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let appsList = []
      if (appsRes.ok) {
        const appsData = await appsRes.json()
        if (appsData?.data && Array.isArray(appsData.data)) {
          appsList = appsData.data
        }
      }

      setApplications(appsList)

      // Calculate stats
      setStats({
        total: appsList.length,
        pending: appsList.filter(a => a.status?.toLowerCase() === 'pending').length,
        reviewed: appsList.filter(a => 
          ['reviewing', 'shortlisted', 'reviewed'].includes(a.status?.toLowerCase())
        ).length,
        accepted: appsList.filter(a => 
          ['hired', 'accepted'].includes(a.status?.toLowerCase())
        ).length
      })

    } catch (e) {
      console.error('Failed to load dashboard', e)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    const map = {
      'pending': 'pending',
      'reviewed': 'reviewed',
      'reviewing': 'reviewed',
      'shortlisted': 'reviewed',
      'accepted': 'accepted',
      'hired': 'accepted',
      'rejected': 'rejected'
    }
    return map[status?.toLowerCase()] || 'pending'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="dashboard-page">
      <h1>My Dashboard</h1>
      <p>Welcome back, {user?.first_name || user?.email || 'Job Seeker'}!</p>
      
      {/* System Status Panel */}
      <div className="system-panel">
        <h3>System Integration Status</h3>
        <div className="status-grid">
          <div className="status-card">
            <span className="status-icon">🌐</span>
            <span className="status-label">API</span>
            <span className={`status-value ${systemHealth.api}`}>{systemHealth.api}</span>
          </div>
          <div className="status-card">
            <span className="status-icon">🗄️</span>
            <span className="status-label">Database</span>
            <span className={`status-value ${systemHealth.database}`}>{systemHealth.database}</span>
          </div>
          <div className="status-card">
            <span className="status-icon">🔄</span>
            <span className="status-label">ETL Pipeline</span>
            <span className={`status-value ${systemHealth.etl}`}>{systemHealth.etl}</span>
          </div>
          <div className="status-card">
            <span className="status-icon">📨</span>
            <span className="status-label">Message Queue</span>
            <span className={`status-value ${systemHealth.messaging}`}>{systemHealth.messaging}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="btn-retry">Retry</button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Applications Stats */}
        <div className="dashboard-card">
          <h3>My Applications</h3>
          <div className="stats-row">
            <div className="stat">
              <span className="number">{stats.total}</span>
              <span className="label">Total</span>
            </div>
            <div className="stat pending">
              <span className="number">{stats.pending}</span>
              <span className="label">Pending</span>
            </div>
            <div className="stat reviewed">
              <span className="number">{stats.reviewed}</span>
              <span className="label">Reviewed</span>
            </div>
            <div className="stat accepted">
              <span className="number">{stats.accepted}</span>
              <span className="label">Accepted</span>
            </div>
          </div>
        </div>

        {/* Saved Jobs */}
        <div className="dashboard-card">
          <h3>Saved Jobs</h3>
          <div className="stat">
            <span className="number">{savedJobs.length}</span>
            <span className="label">jobs saved</span>
          </div>
          <button 
            className="btn-view"
            onClick={() => navigate('/saved-jobs')}
          >
            View Saved
          </button>
        </div>

        {/* Profile */}
        <div className="dashboard-card">
          <h3>Profile</h3>
          <div className="progress-bar">
            <div className="progress" style={{ width: '85%' }}></div>
          </div>
          <p>85% complete</p>
          <button 
            className="btn-edit"
            onClick={() => navigate('/profile')}
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-list">
        <h3>Recent Applications</h3>
        
        {loading ? (
          <div className="loading-state">Loading your applications...</div>
        ) : applications.length === 0 ? (
          <div className="no-applications">
            <p>You haven't applied to any jobs yet.</p>
            <button 
              className="btn-browse"
              onClick={() => navigate('/jobs')}
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          applications.map(app => (
            <div 
              key={app.application_id || app.id} 
              className="application-item"
              onClick={() => navigate(`/jobs/${app.job_id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="app-info">
                <h4>{app.job_title || app.job}</h4>
                <p>{app.company_name || app.company}</p>
              </div>
              <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                {app.status || 'Pending'}
              </span>
              <span className="date">{formatDate(app.applied_at || app.date)}</span>
            </div>
          ))
        )}
      </div>

      {/* Saved Jobs Preview */}
      {savedJobs.length > 0 && (
        <div className="saved-jobs-preview">
          <h3>Recently Saved Jobs</h3>
          {savedJobs.slice(0, 3).map(job => (
            <div 
              key={job.job_id} 
              className="application-item"
              onClick={() => navigate(`/jobs/${job.job_id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="app-info">
                <h4>{job.title}</h4>
                <p>{job.company}</p>
              </div>
              <span className="date">{job.location}</span>
            </div>
          ))}
          {savedJobs.length > 3 && (
            <button 
              className="btn-view-all"
              onClick={() => navigate('/saved-jobs')}
            >
              View All {savedJobs.length} Saved Jobs →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
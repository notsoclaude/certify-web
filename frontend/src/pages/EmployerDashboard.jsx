import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/employer-dashboard.css'

const API_BASE_URL = 'http://127.0.0.1:5000'

function EmployerDashboard({ systemHealth }) {
  const { user, isAuthenticated, getToken } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplicants: 0,
    pending: 0,
    reviewed: 0,
    accepted: 0
  })
  
  const [recentApplications, setRecentApplications] = useState([])
  const [loading, setLoading] = useState(true)

  // =========================
  // AUTH CHECK
  // =========================
  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
    if (user?.user_type !== 'employer') navigate('/')
  }, [isAuthenticated, user, navigate])

  // =========================
  // FETCH REAL DATA
  // =========================
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'employer') {
      fetchDashboardData()
    }
  }, [isAuthenticated, user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = getToken()
      
      if (!token) {
        console.error('No token found')
        return
      }

      // Step 1: Fetch all jobs
      const jobsRes = await fetch(`${API_BASE_URL}/api/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!jobsRes.ok) throw new Error('Failed to fetch jobs')
      const jobsData = await jobsRes.json()
      
      // Extract jobs array
      let jobsList = []
      if (jobsData?.data?.jobs && Array.isArray(jobsData.data.jobs)) {
        jobsList = jobsData.data.jobs
      } else if (Array.isArray(jobsData)) {
        jobsList = jobsData
      }

      // Filter employer's jobs (include jobs without employer_id for backwards compatibility)
      const userId = user?.id || user?.user_id || user?.email
      const employerJobs = jobsList.filter(job => {
        if (job.employer_id && job.employer_id === userId) return true
        if (!job.employer_id) return true // Include old jobs
        return false
      })

      // Step 2: Fetch applicants for all jobs
      let allApplicants = []
      for (const job of employerJobs) {
        if (!job.job_id) continue
        
        try {
          const appRes = await fetch(`${API_BASE_URL}/api/jobs/${job.job_id}/applicants`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (appRes.ok) {
            const appData = await appRes.json()
            let appsList = []
            
            if (appData?.data && Array.isArray(appData.data)) {
              appsList = appData.data
            } else if (Array.isArray(appData)) {
              appsList = appData
            }

            // Add job info to each applicant
            const appsWithJob = appsList.map(app => ({
              ...app,
              job_title: job.title,
              job_id: job.job_id
            }))
            
            allApplicants = [...allApplicants, ...appsWithJob]
          }
        } catch (err) {
          console.warn(`Error fetching applicants for job ${job.job_id}:`, err)
        }
      }

      // Calculate stats
      const calculatedStats = {
        totalJobs: employerJobs.length,
        activeJobs: employerJobs.filter(j => j.status === 'active').length,
        totalApplicants: allApplicants.length,
        pending: allApplicants.filter(a => a.status?.toLowerCase() === 'pending').length,
        reviewed: allApplicants.filter(a => 
          ['reviewing', 'shortlisted'].includes(a.status?.toLowerCase())
        ).length,
        accepted: allApplicants.filter(a => a.status?.toLowerCase() === 'hired').length
      }

      setStats(calculatedStats)
      
      // Get recent applications (last 5, sorted by date)
      const recent = allApplicants
        .sort((a, b) => new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at))
        .slice(0, 5)
      
      setRecentApplications(recent)
      
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress
  const progress = stats.totalApplicants
    ? Math.min((stats.accepted / stats.totalApplicants) * 100, 100)
    : 0

  const getStatusBadgeClass = (status) => {
    const map = {
      'pending': 'pending',
      'reviewing': 'reviewed',
      'shortlisted': 'reviewed',
      'hired': 'accepted',
      'accepted': 'accepted',
      'rejected': 'rejected'
    }
    return map[status?.toLowerCase()] || 'pending'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="dashboard-page">

      <h1>Employer Dashboard</h1>

      {/* =========================
          SYSTEM PANEL
      ========================= */}
      <div className="system-panel">
        <h3>⚙️ System Status</h3>

        <div className="status-grid">

          <div className="status-card">
            <div className="status-icon">🌐</div>
            <div className="status-label">API</div>
            <div className={`status-value ${systemHealth.api}`}>
              {systemHealth.api}
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">🗄️</div>
            <div className="status-label">Database</div>
            <div className={`status-value ${systemHealth.database}`}>
              {systemHealth.database}
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">🔄</div>
            <div className="status-label">ETL</div>
            <div className={`status-value ${systemHealth.etl}`}>
              {systemHealth.etl}
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon">📩</div>
            <div className="status-label">Messaging</div>
            <div className={`status-value ${systemHealth.messaging}`}>
              {systemHealth.messaging}
            </div>
          </div>

        </div>
      </div>

      {/* =========================
          DASHBOARD GRID
      ========================= */}
      <div className="dashboard-grid">

        {/* JOB STATS */}
        <div className="dashboard-card">
          <h3>📊 Job Overview</h3>

          <div className="stats-row">

            <div className="stat">
              <div className="number">{stats.totalJobs}</div>
              <div className="label">Total Jobs</div>
            </div>

            <div className="stat">
              <div className="number">{stats.activeJobs}</div>
              <div className="label">Active</div>
            </div>

          </div>
        </div>

        {/* APPLICATION STATS */}
        <div className="dashboard-card">
          <h3>👥 Applications</h3>

          <div className="stats-row">

            <div className="stat pending">
              <div className="number">{stats.pending}</div>
              <div className="label">Pending</div>
            </div>

            <div className="stat reviewed">
              <div className="number">{stats.reviewed}</div>
              <div className="label">Reviewed</div>
            </div>

            <div className="stat accepted">
              <div className="number">{stats.accepted}</div>
              <div className="label">Accepted</div>
            </div>

          </div>

          {/* PROGRESS */}
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }} />
          </div>

          <small>{Math.round(progress)}% hiring success rate</small>
        </div>

      </div>

      {/* =========================
          RECENT APPLICATIONS (REAL DATA)
      ========================= */}
      <div className="applications-list">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>📝 Recent Applications</h3>
          <Link to="/employer/candidates" className="btn-view-all">
            View All Candidates →
          </Link>
        </div>

        {loading ? (
          <div className="loading-state">Loading applications...</div>
        ) : recentApplications.length === 0 ? (
          <div className="no-applications">
            <p>No applications yet. Post a job to get started!</p>
            <button 
              onClick={() => navigate('/employer/post-job')} 
              className="btn-post-job"
            >
              Post New Job
            </button>
          </div>
        ) : (
          recentApplications.map((app, index) => (
            <div key={app.application_id || index} className="application-item">
              <div className="app-info">
                <h4>{app.job_title || 'Unknown Job'}</h4>
                <p>{app.first_name} {app.last_name}</p>
              </div>
              <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                {app.status || 'Pending'}
              </span>
              <span className="date">{formatDate(app.applied_at || app.created_at)}</span>
              <button 
                className="btn-view"
                onClick={() => navigate(`/employer/jobs/${app.job_id}/applicants`)}
              >
                View
              </button>
            </div>
          ))
        )}

      </div>

    </div>
  )
}

export default EmployerDashboard
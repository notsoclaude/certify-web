import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import "../styles/Applicants.css"

// API base URL - change this if your backend runs on different port
const API_BASE_URL = 'http://127.0.0.1:5000'

function Applicants() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user, getToken } = useAuth()
  
  const [applicants, setApplicants] = useState([])
  const [jobDetails, setJobDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const isEmployer = user?.user_type === 'employer'

  useEffect(() => {
    if (!isEmployer) {
      navigate('/jobs')
      return
    }
    fetchApplicants()
  }, [jobId, isEmployer, navigate])

  const fetchApplicants = async () => {
    try {
      setLoading(true)
      const token = getToken()
      
      if (!token) {
        setError('Authentication required')
        return
      }

      // Fetch job details
      const jobRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!jobRes.ok) throw new Error('Failed to fetch job details')
      const jobData = await jobRes.json()

      // FIXED: correct backend structure
      setJobDetails(jobData.data?.job || null)

      // Fetch applicants
      const appRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/applicants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!appRes.ok) throw new Error('Failed to fetch applicants')
      const appData = await appRes.json()

      // FIXED: always safe array
      setApplicants(appData.data || [])
      
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const token = getToken()
      
      const res = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Failed to update status')
      
      // Update local state
      setApplicants(prev => prev.map(app => 
        app.application_id === applicationId 
          ? { ...app, status: newStatus }
          : app
      ))
      
    } catch (err) {
      console.error(err)
      alert('Failed to update status')
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'reviewing': 'status-reviewing',
      'shortlisted': 'status-shortlisted',
      'rejected': 'status-rejected',
      'hired': 'status-hired'
    }
    return statusMap[status?.toLowerCase()] || 'status-pending'
  }

  const filteredApplicants = filterStatus === 'all' 
    ? applicants 
    : applicants.filter(app => app.status?.toLowerCase() === filterStatus)

  const stats = {
    total: applicants.length,
    pending: applicants.filter(a => a.status?.toLowerCase() === 'pending').length,
    reviewing: applicants.filter(a => a.status?.toLowerCase() === 'reviewing').length,
    shortlisted: applicants.filter(a => a.status?.toLowerCase() === 'shortlisted').length,
    rejected: applicants.filter(a => a.status?.toLowerCase() === 'rejected').length
  }

  if (loading) return (
    <div className="applicants-container">
      <div className="loading-state">Loading applicants...</div>
    </div>
  )

  if (error) return (
    <div className="applicants-container">
      <div className="error-state">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchApplicants} className="btn-retry">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="applicants-container">
      
      {/* Header */}
      <div className="applicants-header">
        <div className="header-left">
          <button onClick={() => navigate('/employer/dashboard')} className="btn-back">
            ← Back to Jobs
          </button>
          <h1>Job Applicants</h1>
          <p className="job-title">{jobDetails?.title || 'Loading...'}</p>
        </div>

        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card shortlisted">
            <span className="stat-number">{stats.shortlisted}</span>
            <span className="stat-label">Shortlisted</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Applicants ({stats.total})</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="reviewing">Reviewing ({stats.reviewing})</option>
            <option value="shortlisted">Shortlisted ({stats.shortlisted})</option>
            <option value="rejected">Rejected ({stats.rejected})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredApplicants.length === 0 ? (
        <div className="no-applicants">
          <div className="no-data-icon">👥</div>
          <h3>No applicants found</h3>
          <p>No one has applied to this job yet.</p>
        </div>
      ) : (
        <div className="applicants-table-container">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Applied Date</th>
                <th>Experience</th>
                <th>Resume</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredApplicants.map((applicant) => (
                <tr key={applicant.application_id || applicant.id}>
                  
                  <td className="applicant-info">
                    <div className="applicant-avatar">
                      {applicant.first_name?.[0]}{applicant.last_name?.[0]}
                    </div>
                    <div>
                      <strong>
                        {applicant.first_name} {applicant.last_name}
                      </strong>
                      <div className="applicant-headline">
                        {applicant.headline || 'Job Seeker'}
                      </div>
                    </div>
                  </td>

                  <td>
                    📧 {applicant.email}
                    {applicant.phone && <div>📱 {applicant.phone}</div>}
                  </td>

                  <td>
                    {new Date(applicant.applied_date || applicant.created_at).toLocaleDateString()}
                  </td>

                  <td>
                    {applicant.years_experience || 0} years
                  </td>

                  <td>
                    {applicant.resume_url ? (
                      <a 
                        href={`${API_BASE_URL}${applicant.resume_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resume-link"
                      >
                        📄 View Resume
                      </a>
                    ) : (
                      <span className="no-resume">No resume</span>
                    )}
                  </td>

                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(applicant.status)}`}>
                      {applicant.status || 'Pending'}
                    </span>
                  </td>

                  <td>
                    <select
                      value={applicant.status || 'pending'}
                      onChange={(e) =>
                        updateApplicationStatus(applicant.application_id, e.target.value)
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                      <option value="hired">Hired</option>
                    </select>

                    <Link to="#" className="btn-profile">
                      Profile
                    </Link>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

export default Applicants
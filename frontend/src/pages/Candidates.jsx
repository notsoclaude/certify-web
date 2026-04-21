import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import "../styles/Applicants.css"

const API_BASE_URL = 'http://127.0.0.1:5000'

function Candidates() {
  const navigate = useNavigate()
  const { user, getToken } = useAuth()
  
  const [applicants, setApplicants] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const isEmployer = user?.user_type === 'employer'

  useEffect(() => {
    if (!isEmployer) {
      navigate('/jobs')
      return
    }
    fetchAllCandidates()
  }, [isEmployer, navigate])

  const fetchAllCandidates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = getToken()
      
      if (!token) {
        setError('Authentication required. Please log in again.')
        return
      }

      // Step 1: Fetch all jobs
      const jobsRes = await fetch(`${API_BASE_URL}/api/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!jobsRes.ok) {
        throw new Error(`Failed to fetch jobs: ${jobsRes.status}`)
      }
      
      const jobsData = await jobsRes.json()
      
      // Extract jobs array from response
      let jobsList = []
      if (jobsData?.data?.jobs && Array.isArray(jobsData.data.jobs)) {
        jobsList = jobsData.data.jobs
      } else if (Array.isArray(jobsData)) {
        jobsList = jobsData
      } else if (jobsData?.jobs && Array.isArray(jobsData.jobs)) {
        jobsList = jobsData.jobs
      }

      console.log('Total jobs fetched:', jobsList.length)
      console.log('Current user:', user)

      // Filter jobs for this employer
      const userId = user?.id || user?.user_id
      const employerJobs = jobsList.filter(job => {
        // Match by employer_id (new jobs)
        if (job.employer_id && (
          job.employer_id === userId || 
          job.employer_id === user?.email
        )) {
          return true
        }
        // Include jobs without employer_id (old jobs before fix)
        if (!job.employer_id) {
          return true
        }
        return false
      })

      console.log('Employer jobs found:', employerJobs.length)
      console.log('Employer jobs:', employerJobs.map(j => ({ id: j.job_id, title: j.title, employer_id: j.employer_id })))
      
      setJobs(employerJobs)

      // Step 2: Fetch applicants for each job
      let allApplicants = []
      
      for (const job of employerJobs) {
        if (!job.job_id) continue
        
        try {
          const appRes = await fetch(`${API_BASE_URL}/api/jobs/${job.job_id}/applicants`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (appRes.ok) {
            const appData = await appRes.json()
            
            // Extract applicants array
            let appsList = []
            if (appData?.data && Array.isArray(appData.data)) {
              appsList = appData.data
            } else if (Array.isArray(appData)) {
              appsList = appData
            } else if (appData?.applicants && Array.isArray(appData.applicants)) {
              appsList = appData.applicants
            }

            console.log(`Job ${job.job_id} (${job.title}): ${appsList.length} applicants`)

            // Add job info to each applicant
            const appsWithJobInfo = appsList.map(app => ({
              ...app,
              job_title: job.title,
              job_id: job.job_id,
              company: job.company || job.company_name
            }))
            
            allApplicants = [...allApplicants, ...appsWithJobInfo]
          } else {
            console.warn(`Failed to fetch applicants for job ${job.job_id}:`, appRes.status)
          }
        } catch (err) {
          console.error(`Error fetching applicants for job ${job.job_id}:`, err)
        }
      }

      console.log('Total applicants across all jobs:', allApplicants.length)
      setApplicants(allApplicants)
      
    } catch (err) {
      console.error('Fetch error:', err)
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
      <div className="loading-state">Loading all candidates...</div>
    </div>
  )

  if (error) return (
    <div className="applicants-container">
      <div className="error-state">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchAllCandidates} className="btn-retry">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="applicants-container">
      
      {/* Header */}
      <div className="applicants-header">
        <div className="header-left">
          <button onClick={() => navigate('/employer/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>All Candidates</h1>
          <p>View applicants across all your job postings</p>
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
          <h3>No candidates found</h3>
          <p>No one has applied to your jobs yet.</p>
          <button onClick={fetchAllCandidates} className="btn-retry" style={{marginTop: '20px'}}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="applicants-table-container">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Job Position</th>
                <th>Contact</th>
                <th>Applied Date</th>
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
                    <Link 
                      to={`/employer/jobs/${applicant.job_id}/applicants`}
                      className="job-link"
                    >
                      {applicant.job_title}
                    </Link>
                    <div style={{fontSize: '12px', color: '#666'}}>
                      {applicant.company}
                    </div>
                  </td>

                  <td>
                    <div>📧 {applicant.email}</div>
                    {applicant.phone && <div>📱 {applicant.phone}</div>}
                  </td>

                  <td>
                    {new Date(applicant.applied_at || applicant.created_at || applicant.applied_date).toLocaleDateString()}
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

export default Candidates
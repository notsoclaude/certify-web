import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/saved-jobs.css'

function SavedJobs() {
  const { isAuthenticated, getToken } = useAuth()  // ✅ USE getToken FROM CONTEXT
  const navigate = useNavigate()

  const [savedJobs, setSavedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // =========================
  // LOAD SAVED JOBS
  // =========================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    fetchSavedJobs()
  }, [isAuthenticated])

  const fetchSavedJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = getToken()  // ✅ USE getToken()

      if (!token) {
        navigate('/login')
        return
      }

      const res = await fetch('http://127.0.0.1:5000/api/saved-jobs', {  // ✅ FULL URL
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      console.log("SAVED JOBS RESPONSE:", data)

      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to load saved jobs')
      }

      setSavedJobs(data.data?.saved_jobs || [])

    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // UNSAVE JOB
  // =========================
  const unsaveJob = async (jobId) => {
    try {
      const token = getToken()  // ✅ USE getToken()

      const res = await fetch(`http://127.0.0.1:5000/api/saved-jobs/${jobId}`, {  // ✅ FULL URL
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setSavedJobs(prev =>
          prev.filter(job => job.job_id !== jobId)
        )
      } else {
        console.error(data.message)
      }

    } catch (err) {
      console.error("Unsave error:", err)
    }
  }

  // =========================
  // UI
  // =========================
  if (loading) return <div className="loading">Loading saved jobs...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="saved-jobs-page">

      <div className="saved-jobs-header">
        <h1>Saved Jobs</h1>
        <p>Your bookmarked opportunities</p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <h3>No saved jobs yet</h3>
          <p>Save jobs you like so you can review them later.</p>
          <Link to="/jobs" className="btn-browse">Browse Jobs</Link>
        </div>
      ) : (
        <div className="saved-jobs-container">

          {savedJobs.map(job => (
            <div className="saved-job-card" key={job.job_id}>

              <h3>{job.title || "No title"}</h3>

              <p className="location">
                📍 {job.location || "No location"}
              </p>

              <p className="job-description">
                {job.description || "No description available"}
              </p>

              <div className="job-meta">
                <span>{job.job_type || "N/A"}</span>
                <span>{job.status || "active"}</span>
              </div>

              <div className="job-actions">
                <Link to={`/jobs/${job.job_id}`} className="btn-view">
                  View
                </Link>

                <button
                  onClick={() => unsaveJob(job.job_id)}
                  className="btn-unsave"
                >
                  Remove
                </button>
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  )
}

export default SavedJobs
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import '../styles/jobDetails.css'

function JobDetails() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, getToken } = useAuth()  // ✅ ADD getToken

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // =========================
  // LOAD JOB
  // =========================
  useEffect(() => {
    if (!jobId) return

    fetchJobDetails()
    if (isAuthenticated) checkIfSaved()
  }, [jobId, isAuthenticated])

  const fetchJobDetails = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`)  // FULL URL

      if (!res.ok) throw new Error("Failed to load job")

      const data = await res.json()

      if (data.status !== 'success') {
        throw new Error(data.message || "Job not found")
      }

      const j = data.data.job

      setJob({
        id: j.job_id || jobId,
        title: j.title || "Unknown",
        company: j.company || "Unknown",
        location: j.location || "Unknown",

        job_type: (j.type || j.job_type || "unknown").toLowerCase(),

        salary:
          j.salary_min && j.salary_max
            ? `${j.salary_min} - ${j.salary_max}`
            : "Not specified",

        status: j.status || "active",
        posted: j.posted_date || "N/A",
        description: j.description || "No description"
      })

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // CHECK SAVED
  // =========================
  const checkIfSaved = async () => {
    try {
      const token = getToken()  // USE getToken()
      if (!token) return

      const res = await fetch(`http://127.0.0.1:5000/api/saved-jobs/check/${jobId}`, {  //  FULL URL
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (data.status === 'success') {
        setIsSaved(data.data.is_saved)
      }
    } catch (err) {
      console.log(err)
    }
  }

  // =========================
  // SAVE / UNSAVE
  // =========================
  const toggleSave = async () => {
    console.log("🔥 SAVE CLICKED:", jobId)

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const token = getToken()  //  USE getToken()
    console.log("TOKEN:", token)

    if (!token) {
      alert("No token found. Please login again.")
      return
    }

    setSaveLoading(true)

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/saved-jobs`, {  //  FULL URL
        method: isSaved ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: jobId
        })
      })

      console.log("STATUS:", res.status)

      const data = await res.json()
      console.log("RESPONSE:", data)

      if (data.status === 'success') {
        setIsSaved(prev => !prev)
      } else {
        alert(data.message || "Save failed")
      }

    } catch (err) {
      console.log("ERROR:", err)
    } finally {
      setSaveLoading(false)
    }
  }

  // =========================
  // UI STATES
  // =========================
  if (loading) return <div className="loading">Loading job details...</div>
  if (error) return <div className="error">{error}</div>
  if (!job) return <div className="error">Job not found</div>

  return (
    <div className="job-details-page">

      <button onClick={() => navigate('/jobs')} className="btn-back">
        ← Back
      </button>

      <div className="job-header">
        <h1>{job.title}</h1>

        <span className={`badge type-${job.job_type}`}>
          {(job.job_type || "UNKNOWN").toUpperCase()}
        </span>

        <p>📍 {job.location}</p>
      </div>

      <div className="job-meta">
        <p>🆔 {job.id}</p>
        <p>🏢 {job.company}</p>
        <p>📊 {job.status}</p>
        <p>💰 {job.salary}</p>
        <p>📅 {job.posted}</p>
        <p>📌 {job.job_type}</p>
      </div>

      <div className="job-content">
        <h3>Description</h3>
        <p>{job.description}</p>
      </div>

      <div className="job-actions">

        <button
          onClick={toggleSave}
          disabled={saveLoading}
          className={`btn-save ${isSaved ? 'saved' : ''}`}
        >
          {saveLoading
            ? "Saving..."
            : isSaved
              ? "💾 Saved"
              : "🔖 Save Job"}
        </button>

        <button
          onClick={() => navigate(`/apply/${jobId}`)}
          className="btn-apply"
        >
          Apply Now
        </button>

      </div>

    </div>
  )
}

export default JobDetails
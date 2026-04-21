import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import EmployeeTable from '../components/EmployeeTable'
import '../styles/jobs.css'

function EmployerJob() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      // ✅ FIXED: Removed trailing space from URL
      const res = await fetch('http://127.0.0.1:5000/api/jobs')
      const data = await res.json()

      console.log('API RESPONSE:', data)
      // Debug: Log the first job to see what fields exist
      if (data.data?.jobs?.length > 0) {
        console.log('First job fields:', Object.keys(data.data.jobs[0]))
        console.log('First job data:', data.data.jobs[0])
      }

      if (!res.ok) {
        throw new Error(data.message || 'Server error')
      }

      if (data.status === 'success' && data.data?.jobs) {
        setJobs(data.data.jobs)
      } else {
        setError(data.message || 'Invalid API response')
      }
    } catch (err) {
      console.error('FETCH ERROR:', err)
      setError(err.message || 'Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (jobId) => {
    setJobs((prev) => prev.filter((job) => job.job_id !== jobId))
  }

  if (loading) {
    return (
      <div className="page-loading">
        <p>Loading employer jobs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button onClick={fetchJobs}>Retry</button>
      </div>
    )
  }

  return (
    <div className="jobs-page">
      <h1>Employer Job Dashboard</h1>

      <button
        className="btn-primary"
        onClick={() => navigate('/employer/post-job')}
      >
        + Post New Job
      </button>

      {jobs.length === 0 ? (
        <p>No active jobs found.</p>
      ) : (
        <EmployeeTable
          jobs={jobs}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default EmployerJob
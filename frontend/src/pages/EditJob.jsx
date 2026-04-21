import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

function EditJob() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user, getToken } = useAuth()

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary_min: '',
    salary_max: '',
    job_type: '',
    description: ''
  })

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [updated, setUpdated] = useState(false)

  // FETCH JOB DATA ON MOUNT
  useEffect(() => {
    fetchJob()
  }, [jobId])

  const fetchJob = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`)
      const data = await res.json()

      if (data.status === 'success') {
        const job = data.data.job
        setFormData({
          title: job.title || '',
          company: job.company || '',
          location: job.location || '',
          salary_min: job.salary_min || '',
          salary_max: job.salary_max || '',
          job_type: job.job_type || '',
          description: job.description || ''
        })
      } else {
        setMessage('❌ Job not found')
      }
    } catch (err) {
      console.error(err)
      setMessage('❌ Failed to load job')
    } finally {
      setFetchLoading(false)
    }
  }

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // SUBMIT UPDATED JOB
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const token = getToken()

      if (!token) {
        setMessage('❌ Token is missing. Please login again.')
        return
      }

      const res = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      let data
      try {
        data = await res.json()
      } catch {
        setMessage('❌ Invalid server response')
        return
      }

      if (res.ok) {
        setUpdated(true)
        setMessage('✅ Job updated successfully!')
      } else {
        setMessage(data.message || '❌ Failed to update job')
      }

    } catch (err) {
      console.error(err)
      setMessage('❌ Server error')
    } finally {
      setLoading(false)
    }
  }

  // BLOCK NON-EMPLOYERS
  if (!user || user.user_type !== 'employer') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h2>Access Denied</h2>
          <p>Only employers can edit jobs.</p>
        </div>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <p>Loading job details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">

        <h1>Edit Job</h1>
        <p>Update job listing: <strong>{jobId}</strong></p>

        {message && (
          <div className={`auth-error ${updated ? 'success' : ''}`}>
            {message}
          </div>
        )}

        {/* SHOW "VIEW JOBS" BUTTON AFTER SUCCESSFUL UPDATE */}
        {updated ? (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              className="btn-auth" 
              onClick={() => navigate('/employer/job')}
            >
              View My Jobs →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">

            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Minimum Salary (PHP)</label>
              <input
                type="number"
                name="salary_min"
                value={formData.salary_min}
                onChange={handleChange}
                placeholder="60000"
                required
              />
            </div>

            <div className="form-group">
              <label>Maximum Salary (PHP)</label>
              <input
                type="number"
                name="salary_max"
                value={formData.salary_max}
                onChange={handleChange}
                placeholder="110000"
                required
              />
            </div>

            <div className="form-group">
              <label>Job Type</label>
              <select
                name="job_type"
                value={formData.job_type}
                onChange={handleChange}
                required
              >
                <option value="">Select type</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="5"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn-auth"
                style={{ background: '#666' }}
                onClick={() => navigate('/employer/job')}
              >
                Cancel
              </button>
              
              <button 
                className="btn-auth" 
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? 'Updating...' : 'Update Job'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}

export default EditJob
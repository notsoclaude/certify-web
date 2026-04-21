import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

function EmployerPostJob() {
  const navigate = useNavigate()
  const { user } = useAuth()

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
  const [message, setMessage] = useState('')
  const [posted, setPosted] = useState(false)

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // ✅ ADDED: Increment/Decrement salary
  const adjustSalary = (field, amount) => {
    const currentValue = parseInt(formData[field]) || 0
    const newValue = Math.max(0, currentValue + amount)
    setFormData({
      ...formData,
      [field]: newValue.toString()
    })
  }

  // SUBMIT JOB
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const token = localStorage.getItem('token')

      if (!token) {
        setMessage('❌ Token is missing. Please login again.')
        return
      }

      const res = await fetch('http://127.0.0.1:5000/api/jobs', {
        method: 'POST',
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
        setPosted(true)
        setMessage('✅ Job posted successfully!')
      } else {
        setMessage(data.message || '❌ Failed to post job')
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
          <p>Only employers can post jobs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">

        <h1>Post a Job</h1>
        <p>Create job listing for applicants</p>

        {message && (
          <div className={`auth-error ${posted ? 'success' : ''}`}>
            {message}
          </div>
        )}

        {/* ✅ SHOW "VIEW JOBS" BUTTON AFTER SUCCESSFUL POST */}
        {posted ? (
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

            {/* ✅ UPDATED: Salary Min with up/down buttons */}
            <div className="form-group">
              <label>Minimum Salary (PHP)</label>
              <div className="salary-input-wrapper">
                <input
                  type="number"
                  name="salary_min"
                  value={formData.salary_min}
                  onChange={handleChange}
                  placeholder="60000"
                  min="0"
                  step="1000"
                  required
                />
                <div className="salary-arrows">
                  <button 
                    type="button" 
                    className="arrow-btn up"
                    onClick={() => adjustSalary('salary_min', 1000)}
                    tabIndex="-1"
                  >
                    ▲
                  </button>
                  <button 
                    type="button" 
                    className="arrow-btn down"
                    onClick={() => adjustSalary('salary_min', -1000)}
                    tabIndex="-1"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ UPDATED: Salary Max with up/down buttons */}
            <div className="form-group">
              <label>Maximum Salary (PHP)</label>
              <div className="salary-input-wrapper">
                <input
                  type="number"
                  name="salary_max"
                  value={formData.salary_max}
                  onChange={handleChange}
                  placeholder="110000"
                  min="0"
                  step="1000"
                  required
                />
                <div className="salary-arrows">
                  <button 
                    type="button" 
                    className="arrow-btn up"
                    onClick={() => adjustSalary('salary_max', 1000)}
                    tabIndex="-1"
                  >
                    ▲
                  </button>
                  <button 
                    type="button" 
                    className="arrow-btn down"
                    onClick={() => adjustSalary('salary_max', -1000)}
                    tabIndex="-1"
                  >
                    ▼
                  </button>
                </div>
              </div>
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

            <button className="btn-auth" disabled={loading}>
              {loading ? 'Posting...' : 'Post Job'}
            </button>

          </form>
        )}

      </div>
    </div>
  )
}

export default EmployerPostJob
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import '../styles/apply.css'

function Apply() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    coverLetter: '',
    yearsExperience: '',
    headline: '',
    resume: null
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ✅ ADDED: Increment/Decrement years of experience
  const adjustExperience = (amount) => {
    const currentValue = parseInt(formData.yearsExperience) || 0
    const newValue = Math.max(0, Math.min(50, currentValue + amount))
    setFormData(prev => ({
      ...prev,
      yearsExperience: newValue.toString()
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFormData(prev => ({
      ...prev,
      resume: file
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const form = new FormData()

      form.append('name', formData.name)
      form.append('email', formData.email)
      form.append('phone', formData.phone)
      form.append('cover_letter', formData.coverLetter)
      form.append('years_experience', formData.yearsExperience || '0')
      form.append('headline', formData.headline || '')

      if (formData.resume) {
        form.append('resume', formData.resume)
      }

      const res = await fetch(`http://localhost:5000/api/apply/${jobId}`, {
        method: 'POST',
        body: form
      })

      const data = await res.json()

      if (data.status === 'success') {
        setSubmitted(true)
      } else {
        alert('Error: ' + data.message)
      }

    } catch (err) {
      console.error(err)
      alert('Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="apply-success">
        <h1>✅ Application Submitted!</h1>
        <p>Thank you for applying. We will review your application and contact you soon.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="apply-page">
      <h1>Apply for Position</h1>
      <p className="job-id">Job ID: {jobId}</p>

      <form onSubmit={handleSubmit} className="application-form">

        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Professional Headline</label>
          <input
            type="text"
            name="headline"
            value={formData.headline}
            onChange={handleChange}
            placeholder="e.g., Senior React Developer"
          />
        </div>

        {/* ✅ UPDATED: Years of Experience with up/down buttons */}
        <div className="form-group">
          <label>Years of Experience</label>
          <div className="experience-input-wrapper">
            <input
              type="number"
              name="yearsExperience"
              value={formData.yearsExperience}
              onChange={handleChange}
              min="0"
              max="50"
              placeholder="5"
            />
            <div className="experience-arrows">
              <button 
                type="button" 
                className="arrow-btn up"
                onClick={() => adjustExperience(1)}
                tabIndex="-1"
              >
                ▲
              </button>
              <button 
                type="button" 
                className="arrow-btn down"
                onClick={() => adjustExperience(-1)}
                tabIndex="-1"
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Cover Letter</label>
          <textarea
            name="coverLetter"
            value={formData.coverLetter}
            onChange={handleChange}
            rows="6"
            placeholder="Why are you a good fit for this role?"
          />
        </div>

        <div className="form-group">
          <label>Resume</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
          />
          <small>Upload PDF, DOC, or DOCX</small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>

      </form>
    </div>
  )
}

export default Apply
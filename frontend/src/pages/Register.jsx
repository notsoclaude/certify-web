import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

// ✅ UPDATED: lucide icons
import { Eye, EyeOff } from 'lucide-react'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [step, setStep] = useState(1)
  const [userType, setUserType] = useState('')

  // PASSWORD TOGGLE STATES
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company_name: '',
    position: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const selectUserType = (type) => {
    setUserType(type)
    setStep(2)
  }

  const validateStep2 = () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Please fill in all required fields')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateStep2()) return

    setLoading(true)
    setError('')

    const userData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      password: formData.password,
      user_type: userType,
      phone: formData.phone,
      company_name: userType === 'employer' ? formData.company_name : null,
      position: userType === 'employer' ? formData.position : null
    }

    const result = await register(userData)

    if (result.success) {
      if (userType === 'employer') {
        navigate('/employer/home')
      } else {
        navigate('/dashboard')
      }
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  const goBack = () => {
    setStep(1)
    setUserType('')
    setError('')
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Create Account</h1>
        <p>
          Join CERTify to {userType === 'employer' ? 'hire talent' : 'find your dream job'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="user-type-selection">
            <h3>I am a...</h3>

            <button
              type="button"
              className={`type-card ${userType === 'jobseeker' ? 'selected' : ''}`}
              onClick={() => selectUserType('jobseeker')}
            >
              <span className="type-icon">👤</span>
              <h4>Job Seeker</h4>
              <p>Looking for jobs and career opportunities</p>
            </button>

            <button
              type="button"
              className={`type-card ${userType === 'employer' ? 'selected' : ''}`}
              onClick={() => selectUserType('employer')}
            >
              <span className="type-icon">🏢</span>
              <h4>Employer</h4>
              <p>Hiring talent for my organization</p>
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log In</Link>
            </p>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="auth-form">
            <button type="button" className="back-btn" onClick={goBack}>
              ← Back
            </button>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
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

            {/* PASSWORD */}
            <div className="form-group password-group">
              <label>Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="8"
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <small>Must be at least 8 characters</small>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="form-group password-group">
              <label>Confirm Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {/* EMPLOYER FIELDS */}
            {userType === 'employer' && (
              <>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Position *</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default Register
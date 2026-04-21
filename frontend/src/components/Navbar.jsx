import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const menuRef = useRef(null)

  // SAFE ROLE CHECK
  const userType = user?.user_type
  const isEmployer = userType === 'employer'

  // =========================
  // NAV LINKS
  // =========================
  const getNavLinks = () => {
    const commonLinks = [
      { path: '/', label: 'Home', icon: '🏠' },
      { path: '/about', label: 'About', icon: 'ℹ️' }
    ]

    if (!isAuthenticated) {
      return [...commonLinks, { path: '/jobs', label: 'Jobs', icon: '💼' }]
    }

    // 🏢 EMPLOYER NAV
    if (isEmployer) {
      return [
        ...commonLinks,
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/employer/job', label: 'My Jobs', icon: '💼' },
        { path: '/employer/candidates', label: 'Candidates', icon: '👥' },
        { path: '/employer/post-job', label: 'Post Job', icon: '➕' }
      ]
    }

    // 👤 JOB SEEKER NAV
    return [
      ...commonLinks,
      { path: '/jobs', label: 'Jobs', icon: '💼' },
      { path: '/saved-jobs', label: 'Saved', icon: '🔖' },
      { path: '/dashboard', label: 'Dashboard', icon: '📊' }
    ]
  }

  const navLinks = getNavLinks()

  // =========================
  // CLICK OUTSIDE MENU
  // =========================
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // =========================
  // EMPLOYER AUTO REDIRECT
  // =========================
  useEffect(() => {
    if (isAuthenticated && isEmployer && location.pathname === '/') {
      navigate('/employer/dashboard')
    }
  }, [isAuthenticated, isEmployer, location.pathname, navigate])

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    await logout()
    setShowProfileMenu(false)
    navigate('/')
  }

  const getInitials = () => {
    if (!user) return '?'
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  const getDashboardPath = () => {
    return isEmployer ? '/employer/dashboard' : '/dashboard'
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="nav-container">

        {/* LOGO */}
        <Link to="/" className="nav-logo">
          <span className="logo-icon">✓</span>
          <span className="logo-text">CERTify</span>
        </Link>

        {/* NAV LINKS */}
        <div className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* AUTH */}
        <div className="nav-actions">

          {isAuthenticated ? (
            <div className="profile-menu-container" ref={menuRef}>

              <button
                className="profile-trigger"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-avatar">{getInitials()}</div>
                <span className="profile-name">{user?.first_name}</span>
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown">

                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{getInitials()}</div>
                    <div className="dropdown-info">
                      <p>{user?.first_name} {user?.last_name}</p>
                      <p>{user?.email}</p>
                      <span>{userType}</span>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  {/* LINK TO SETTINGS PAGE */}
                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    ⚙️ Settings
                  </Link>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item logout" onClick={handleLogout}>
                    🚪 Log Out
                  </button>

                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-login">Log In</Link>
              <Link to="/register" className="btn-signup">Sign Up</Link>
            </>
          )}

        </div>

      </div>
    </nav>
  )
}

export default Navbar
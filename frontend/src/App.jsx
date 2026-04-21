import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import HomeEmployer from './pages/HomeEmployer'

import Jobs from './pages/Jobs'
import JobDetails from './pages/JobDetails'
import Apply from './pages/Apply'

import Dashboard from './pages/Dashboard'
import EmployerDashboard from './pages/EmployerDashboard'

import About from './pages/About'
import ETLStatus from './components/ETLStatus'

import Login from './pages/Login'
import Register from './pages/Register'
import SavedJobs from './pages/SavedJobs'

import EmployerJob from './pages/EmployerJob'
import EmployerPostJob from './pages/EmployerPostJob'
import EditJob from './pages/EditJob'
import Applicants from './components/Applicants'
import Candidates from './pages/Candidates'

import './App.css'

/* =========================
   API CONFIG (FIXED)
========================= */
const API_URL = "https://certify-api-ho6g.onrender.com"

/* =========================
   LAYOUT
========================= */
function Layout({ children, hideNav }) {
  if (hideNav) return <div className="auth-layout">{children}</div>

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  )
}

/* =========================
   DASHBOARD ROUTER
========================= */
function DashboardRouter({ systemHealth }) {
  const { user } = useAuth()

  if (user?.user_type === 'employer') {
    return <EmployerDashboard systemHealth={systemHealth} />
  }

  return <Dashboard systemHealth={systemHealth} />
}

/* =========================
   APP CONTENT
========================= */
function AppContent({ systemHealth }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register'

  const isEmployer = user?.user_type === 'employer'

  return (
    <Layout hideNav={isAuthPage}>
      <Routes>

        {/* ROOT */}
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : isEmployer ? (
              <Navigate to="/employer/home" replace />
            ) : (
              <Home systemHealth={systemHealth} />
            )
          }
        />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* EMPLOYER HOME */}
        <Route
          path="/employer/home"
          element={
            <ProtectedRoute>
              {isEmployer ? (
                <HomeEmployer systemHealth={systemHealth} />
              ) : (
                <Navigate to="/" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* PUBLIC */}
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />
        <Route path="/apply/:jobId" element={<Apply />} />
        <Route path="/about" element={<About />} />
        <Route path="/system" element={<ETLStatus />} />

        {/* EMPLOYER JOB LIST */}
        <Route
          path="/employer/job"
          element={
            <ProtectedRoute>
              {isEmployer ? <EmployerJob /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* POST JOB */}
        <Route
          path="/employer/post-job"
          element={
            <ProtectedRoute>
              {isEmployer ? <EmployerPostJob /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* EDIT JOB */}
        <Route
          path="/employer/jobs/edit/:jobId"
          element={
            <ProtectedRoute>
              {isEmployer ? <EditJob /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* APPLICANTS */}
        <Route
          path="/employer/jobs/:jobId/applicants"
          element={
            <ProtectedRoute>
              {isEmployer ? <Applicants /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* CANDIDATES */}
        <Route
          path="/employer/candidates"
          element={
            <ProtectedRoute>
              {isEmployer ? <Candidates /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter systemHealth={systemHealth} />
            </ProtectedRoute>
          }
        />

        {/* SAVED JOBS */}
        <Route
          path="/saved-jobs"
          element={
            <ProtectedRoute>
              <SavedJobs />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Layout>
  )
}

/* =========================
   APP ROOT
========================= */
function App() {
  const [systemHealth, setSystemHealth] = useState({
    api: 'checking',
    database: 'checking',
    etl: 'checking',
    messaging: 'checking'
  })

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkSystemHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`)
      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setSystemHealth({
          api: 'online',
          database: data.data.database_status || 'connected',
          etl: 'ready',
          messaging: 'standby'
        })
      }
    } catch {
      setSystemHealth({
        api: 'offline',
        database: 'unknown',
        etl: 'unknown',
        messaging: 'unknown'
      })
    }
  }

  return (
    <AuthProvider>
      <AppContent systemHealth={systemHealth} />
    </AuthProvider>
  )
}

export default App

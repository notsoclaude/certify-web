import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmployeeTable from '../components/EmployeeTable'
import '../styles/jobs.css'

function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    location: searchParams.get('location') || '',
    search: searchParams.get('search') || ''
  })

  // 🔥 Fetch jobs whenever filters change
  useEffect(() => {
    fetchJobs()
  }, [filters])

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (filters.type) params.append('type', filters.type)
      if (filters.location) params.append('location', filters.location)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(
        `http://127.0.0.1:5000/api/jobs?${params.toString()}`
      )

      const data = await res.json()

      if (data.status === 'success') {
        setJobs(data.data.jobs)
      } else {
        setError(data.message)
      }

    } catch (e) {
      setError('Cannot connect to server. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const applyFilters = () => {
    setSearchParams(filters)
  }

  // 🔥 LOADING UI
  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading jobs from database...</p>
      </div>
    )
  }

  // ❌ ERROR UI
  if (error) {
    return (
      <div className="page-error">
        <h2>Error loading jobs</h2>
        <p>{error}</p>
        <button onClick={fetchJobs} className="btn-retry">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="jobs-page">
      <h1>Available Positions</h1>

      <p className="results-info">
        Showing {jobs.length} jobs from PostgreSQL database
      </p>

      {/* FILTERS */}
      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Search jobs..."
          value={filters.search}
          onChange={handleFilterChange}
        />

        <select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">All Types</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>

        <input
          type="text"
          name="location"
          placeholder="Location"
          value={filters.location}
          onChange={handleFilterChange}
        />

        <button onClick={applyFilters} className="btn-primary">
          Apply Filters
        </button>
      </div>

      {/* TABLE */}
      <EmployeeTable jobs={jobs} />
    </div>
  )
}

export default Jobs
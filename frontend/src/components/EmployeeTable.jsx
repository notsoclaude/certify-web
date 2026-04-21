import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './EmployeeTable.css'

function EmployeeTable({ jobs, onDelete }) {
  const navigate = useNavigate()
  const { user, getToken } = useAuth()

  const isEmployer = user?.user_type === 'employer'

  const handleDelete = async (jobId) => {
    if (!isEmployer) return

    const confirmDelete = window.confirm("Delete this job?")
    if (!confirmDelete) return

    try {
      const token = getToken()
      
      if (!token) {
        alert("Please log in again - token not found")
        return
      }

      const res = await fetch(`http://127.0.0.1:5000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()

      if (data.status === 'success') {
        onDelete(jobId)
      } else {
        alert(data.message || "Failed to delete job")
      }

    } catch (err) {
      console.error(err)
      alert("Server error")
    }
  }

  const formatSalary = (job) => {
    const min = job.salary_min || job.salaryMin
    const max = job.salary_max || job.salaryMax
    
    if (min && max) {
      return `₱${parseInt(min).toLocaleString()} - ₱${parseInt(max).toLocaleString()}`
    }
    if (job.salary) {
      return job.salary
    }
    return "Not specified"
  }

  const getJobType = (job) => {
    return job.job_type || job.type || "N/A"
  }

  if (!jobs || jobs.length === 0) {
    return <div className="no-data">No jobs found</div>
  }

  return (
    <div className="employee-table-container">
      <table className="employee-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Salary</th>
            <th>Type</th>
            <th>Posted</th>
            <th>Status</th>
            <th>Applicants</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => (
            <tr key={job.job_id}>
              <td className="mono">{job.job_id}</td>

              <td>
                <strong>{job.title}</strong>
              </td>

              <td>{job.company || job.company_name || job.employer || "N/A"}</td>
              
              <td>{job.location}</td>

              <td>{formatSalary(job)}</td>

              <td>
                <span className={`badge type-${getJobType(job)}`}>
                  {getJobType(job)}
                </span>
              </td>

              <td>
                {new Date(job.posted_date).toLocaleDateString()}
              </td>

              <td>
                <span className={`status-badge ${job.status || 'active'}`}>
                  {job.status || 'active'}
                </span>
              </td>

              <td>
                {isEmployer ? (
                  <button
                    className="btn-view"
                    onClick={() => navigate(`/employer/jobs/${job.job_id}/applicants`)}
                  >
                    View Applicants
                  </button>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>

              <td className="action-buttons">

                {/* Job Seeker: Only View */}
                {!isEmployer && (
                  <Link
                    to={`/jobs/${job.job_id}`}
                    className="btn-view"
                  >
                    View
                  </Link>
                )}

                {/* Employer: Only Edit and Delete (NO View) */}
                {isEmployer && (
                  <>
                    <Link
                      to={`/employer/jobs/edit/${job.job_id}`}
                      className="btn-edit"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(job.job_id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </>
                )}

              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <span>PostgreSQL + Flask API</span>
        <span>Live Employer Dashboard</span>
      </div>
    </div>
  )
}

export default EmployeeTable
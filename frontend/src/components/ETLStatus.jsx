import { useState, useEffect } from 'react'
import './ETLStatus.css'

function ETLStatus() {
  const [etlData, setEtlData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchETLStatus()
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchETLStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchETLStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/etl/status')
      const data = await res.json()
      setEtlData(data.data)
    } catch (e) {
      console.error('Failed to fetch ETL status')
    } finally {
      setLoading(false)
    }
  }

  // Helper to get status color
  const getStatusClass = (event) => {
    if (event === 'new_job') return 'success'
    if (event === 'error') return 'error'
    return 'success'
  }

  return (
    <div className="etl-status-page">
      <h1>🔧 System Integration Monitor</h1>

      {/* Architecture Diagram - Static */}
      <div className="architecture-diagram">
        <h2>ETL Pipeline Flow</h2>
        <div className="flow-steps">
          <div className="step">
            <div className="step-icon">📄</div>
            <h4>1. Legacy XML</h4>
            <p>Source data</p>
            <code>jobs.xml</code>
          </div>
          <div className="arrow">→</div>
          <div className="step active">
            <div className="step-icon">🔄</div>
            <h4>2. XML to JSON</h4>
            <p>Transform</p>
            <code>xml_to_json.py</code>
          </div>
          <div className="arrow">→</div>
          <div className="step active">
            <div className="step-icon">📋</div>
            <h4>3. JSON Output</h4>
            <p>Intermediate</p>
            <code>jobs_converted.json</code>
          </div>
          <div className="arrow">→</div>
          <div className="step active">
            <div className="step-icon">🗄️</div>
            <h4>4. PostgreSQL</h4>
            <p>Database</p>
            <code>exam_app.py</code>
          </div>
          <div className="arrow">→</div>
          <div className="step">
            <div className="step-icon">⚛️</div>
            <h4>5. React Frontend</h4>
            <p>Display</p>
            <code>ETLStatus.jsx</code>
          </div>
        </div>
      </div>

      <div className="status-panels">

        {/* ETL Messages Panel */}
        <div className="panel">
          <h3>📨 Recent RabbitMQ Messages ({etlData?.total_messages || 0} total)</h3>

          {loading ? (
            <p>Loading...</p>
          ) : etlData?.recent_logs?.length > 0 ? (
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Job ID</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {etlData.recent_logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td>{log.event}</td>
                    <td>{log.job_id || 'N/A'}</td>
                    <td>{log.title || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(log.event)}`}>
                        received
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No ETL runs recorded. Start the consumer and producer!</p>
          )}
        </div>

        {/* Queue Status Panel */}
        <div className="panel">
          <h3>📬 Message Queue Status</h3>
          <div className="queue-status">
            <div className="queue-item">
              <span>📨 job_notifications</span>
              <span className="status">Active</span>
            </div>
            <div className="queue-item">
              <span>📨 application_events</span>
              <span className="status">Active</span>
            </div>
            <div className="queue-item">
              <span>📨 user_alerts</span>
              <span className="status">Standby</span>
            </div>
          </div>
        </div>

      </div>

      <div className="actions">
        <button className="btn-refresh" onClick={fetchETLStatus}>
          🔄 Refresh Status
        </button>
      </div>
    </div>
  )
}

export default ETLStatus
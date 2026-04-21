import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>CERTify</h4>
          <p>Career. Explore. Ready. Talent.</p>
          <p>© 2026 University of San Agustin</p>
          <p>IT 324 - System Integration</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <Link to="/jobs">Browse Jobs</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/about">About Us</Link>
          <Link to="/system">System Status</Link>
        </div>
        <div className="footer-section">
          <h4>System</h4>
          <span>🔵 PostgreSQL Database</span>
          <span>🔵 Flask REST API</span>
          <span>🔵 RabbitMQ Messaging</span>
          <span>🔵 React Frontend</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
import '../styles/about.css'

function About() {
  return (
    <div className="about-page">
      <h1>About CERTify</h1>
      
      <section className="about-section">
        <h2>Our Mission</h2>
        <p>
          CERTify (Career. Explore. Ready. Talent.) is a comprehensive job fair platform 
          connecting fresh graduates with employers. Built for IT 324 - System Integration 
          and Architecture at the University of San Agustin.
        </p>
      </section>

      <section className="about-section">
        <h2>System Architecture</h2>
        <div className="tech-stack">
          <div className="tech-item">
            <h4>Frontend</h4>
            <p>React + Vite</p>
          </div>
          <div className="tech-item">
            <h4>Backend</h4>
            <p>Flask REST API</p>
          </div>
          <div className="tech-item">
            <h4>Database</h4>
            <p>PostgreSQL</p>
          </div>
          <div className="tech-item">
            <h4>ETL Pipeline</h4>
            <p>XML → JSON → DB</p>
          </div>
          <div className="tech-item">
            <h4>Messaging</h4>
            <p>RabbitMQ</p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>Project Team</h2>
        <p>Group 2 - IT 324</p>
        <ul className="team-list">
          <li>System Integration Architecture</li>
          <li>University of San Agustin</li>
          <li>College of Liberal Arts, Sciences, and Education</li>
          <li>IT Program</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Features</h2>
        <ul>
          <li>✅ Real-time job listings from PostgreSQL database</li>
          <li>✅ ETL pipeline for legacy XML data integration</li>
          <li>✅ RESTful API with Flask</li>
          <li>✅ Message queue system for notifications</li>
          <li>✅ Responsive React frontend</li>
          <li>✅ Job application tracking</li>
        </ul>
      </section>
    </div>
  )
}

export default About
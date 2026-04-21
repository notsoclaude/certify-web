import './MenuCard.css'

function MenuCard({ title, description, icon, color, stats, connection, onClick }) {
  return (
    <div 
      className="menu-card"
      onClick={onClick}
      style={{ '--card-color': color }}
    >
      <div className="card-icon" style={{ backgroundColor: `${color}20`, color: color }}>
        <span className="icon">{icon}</span>
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
        <span className="card-stats">{stats}</span>
        {connection && (
          <p className="card-connection">🔗 {connection}</p>
        )}
      </div>
      <div className="card-arrow">→</div>
    </div>
  )
}

export default MenuCard
'use client'

import '../globals.css'

export default function MaintenancePage() {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div className="header">
          <div className="logo" style={{ 
            fontSize: '80px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            🔧
          </div>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>
            Site em Manutenção
          </h1>
          <p className="subtitle" style={{ 
            fontSize: '18px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            Estamos trabalhando para melhorar sua experiência.
            <br />
            Voltaremos em breve!
          </p>
        </div>

      </div>
    </div>
  )
}
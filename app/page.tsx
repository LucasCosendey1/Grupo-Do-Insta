'use client'

import Link from 'next/link'
import './globals.css'

export default function Home() {
  return (
    <div className="container">
      <div className="card">
        {/* Header com botão de login */}
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <Link href="/login" className="btn-login">
            Entrar
          </Link>
        </div>

        <div className="header">
          <div className="logo">⚡</div>
          <h1>Grupo do Insta</h1>
        </div>

        <div className="welcome-content">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Crie Grupos</h3>
              <p>Monte grupos personalizados com seus amigos e veja o alcance total do grupo</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analise Métricas</h3>
              <p>Acompanhe estatísticas e o crescimento do seu grupo em tempo real</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Compartilhe</h3>
              <p>Convide novos membros e expanda o alcance do seu grupo</p>
            </div>
          </div>

          <div className="action-buttons">
            <Link href="/criar-grupo" className="btn btn-primary">
              <span className="btn-icon">➕</span>
              Criar Grupo
            </Link>
            
            <Link href="/entrar-grupo" className="btn btn-secondary">
              <span className="btn-icon">🔗</span>
              Entrar em um Grupo
            </Link>
          </div>

          <div className="info-box" style={{ marginTop: '32px' }}>
            <strong>✨ Como funciona:</strong>
            <br/>
            1. Faça login com seu Instagram<br/>
            2. Crie um novo grupo ou entre em um existente<br/>
            3. Adicione membros e veja o alcance total<br/>
            4. Compartilhe com seus amigos!
          </div>
        </div>
      </div>
    </div>
  )
}
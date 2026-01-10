// 📁 ARQUIVO: app/page.tsx
// ⚠️ SUBSTITUIR O ARQUIVO EXISTENTE POR ESTE

'use client'

import { useState } from 'react'
import './globals.css'

export default function Home() {
  const [username, setUsername] = useState('')
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getTotalFollowers = () => {
    return profiles.reduce((total, profile) => total + profile.followers, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('Digite um username')
      return
    }

    const cleanUsername = username.replace('@', '').trim().toLowerCase()
    if (profiles.some(p => p.username.toLowerCase() === cleanUsername)) {
      setError('Este perfil já foi adicionado!')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/scrape?username=${cleanUsername}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar perfil')
      }

      const data = await response.json()
      setProfiles([...profiles, data])
      setUsername('')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = (usernameToRemove) => {
    setProfiles(profiles.filter(p => p.username !== usernameToRemove))
  }

  const handleReset = () => {
    if (window.confirm('Deseja remover todos os perfis do grupo?')) {
      setProfiles([])
      setUsername('')
      setError('')
    }
  }

  // 🔑 MUDANÇA PRINCIPAL: Função de fallback para imagens
  const handleImageError = (e, username) => {
    console.error('Erro ao carregar imagem para:', username)
    e.target.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="logo">⚡</div>
          <h1>Grupo Power</h1>
          <p className="subtitle">Descubra o alcance total do seu grupo</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Adicionar membro (@username)</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite o @username do Instagram"
              className="input"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? '⏳ Buscando...' : '+ Adicionar ao Grupo'}
          </button>

          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}

          {profiles.length === 0 && (
            <div className="info-box">
              <strong>✨ Como funciona:</strong>
              1. Adicione os @usernames dos membros do grupo<br/>
              2. Veja o alcance total somado em tempo real<br/>
              3. Compartilhe o poder do seu grupo!
            </div>
          )}
        </form>

        {profiles.length > 0 && (
          <div className="profiles-container">
            <div className="total-stats">
              <div className="total-label">Alcance Total do Grupo</div>
              <div className="total-number">
                {formatNumber(getTotalFollowers())}
              </div>
              <div className="total-members">
                {profiles.length} {profiles.length === 1 ? 'membro ativo' : 'membros ativos'}
              </div>
            </div>

            <div className="profiles-grid">
              {profiles.map((profile) => (
                <div key={profile.username} className="profile-card">
                  <button 
                    className="remove-btn"
                    onClick={() => handleRemove(profile.username)}
                    title="Remover perfil"
                  >
                    ×
                  </button>
                  <img 
                    src={profile.profilePic}
                    alt={profile.username}
                    className="profile-pic"
                    onError={(e) => handleImageError(e, profile.username)}
                    loading="lazy"
                  />
                  <div className="profile-username">@{profile.username}</div>
                  <div className="profile-followers">
                    {formatNumber(profile.followers)} seguidores
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={handleReset}>
              🔄 Resetar Grupo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
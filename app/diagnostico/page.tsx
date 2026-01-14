'use client'

import { useState } from 'react'
import Link from 'next/link'
import '../globals.css'

export default function DiagnosticoPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testUsername, setTestUsername] = useState('instagram')

  const testAPI = async () => {
    setIsLoading(true)
    setTestResult(null)

    try {
      console.log('🔍 Iniciando teste da API...')
      const startTime = Date.now()

      const response = await fetch(`/api/scrape?username=${testUsername}`)
      const endTime = Date.now()
      
      console.log('📡 Resposta recebida:', response.status)
      
      const data = await response.json()
      const duration = endTime - startTime

      setTestResult({
        success: response.ok,
        status: response.status,
        duration: duration,
        data: data,
        timestamp: new Date().toLocaleString('pt-BR')
      })

      console.log('📦 Dados:', data)

    } catch (error) {
      console.error('❌ Erro:', error)
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toLocaleString('pt-BR')
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '800px' }}>
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo">🔧</div>
          <h1>Diagnóstico da API</h1>
          <p className="subtitle">Teste a conexão com o Instagram</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div className="input-group">
            <label htmlFor="test-username">Username para testar</label>
            <input
              type="text"
              id="test-username"
              value={testUsername}
              onChange={(e) => setTestUsername(e.target.value)}
              placeholder="Digite um @username"
              className="input"
            />
          </div>

          <button 
            onClick={testAPI} 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Testando...' : '🧪 Testar API'}
          </button>
        </div>

        {testResult && (
          <div style={{ 
            background: testResult.success ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)',
            border: `2px solid ${testResult.success ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'}`,
            borderRadius: '16px',
            padding: '24px',
            marginTop: '24px'
          }}>
            <h3 style={{ 
              color: testResult.success ? '#00ff00' : '#ff0000',
              fontSize: '18px',
              marginBottom: '16px',
              fontWeight: '700'
            }}>
              {testResult.success ? '✅ Teste Bem-Sucedido' : '❌ Teste Falhou'}
            </h3>

            <div style={{ 
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.8'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#00bfff' }}>⏱️ Duração:</strong> {testResult.duration}ms
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#00bfff' }}>📅 Timestamp:</strong> {testResult.timestamp}
              </div>

              {testResult.status && (
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#00bfff' }}>📊 Status HTTP:</strong> {testResult.status}
                </div>
              )}

              {testResult.error && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  borderRadius: '8px'
                }}>
                  <strong style={{ color: '#ff6b6b' }}>❌ Erro:</strong>
                  <pre style={{ 
                    marginTop: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {testResult.error}
                  </pre>
                </div>
              )}

              {testResult.data && (
                <div style={{ marginTop: '16px' }}>
                  <strong style={{ color: '#00bfff' }}>📦 Dados Retornados:</strong>
                  <pre style={{ 
                    marginTop: '8px',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: '400px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px'
                  }}>
{JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="info-box" style={{ marginTop: '24px' }}>
          <strong>🔍 O que este teste faz:</strong>
          <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
            1. Chama a API <code>/api/scrape</code> com o username fornecido<br/>
            2. Mede o tempo de resposta<br/>
            3. Mostra o status HTTP e dados retornados<br/>
            4. Identifica erros de conexão ou autenticação
          </p>
        </div>

        <div className="info-box" style={{ marginTop: '16px', background: 'rgba(255, 215, 0, 0.05)', borderColor: 'rgba(255, 215, 0, 0.3)' }}>
          <strong style={{ color: '#FFD700' }}>⚠️ Possíveis Problemas:</strong>
          <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
            • <strong>Status 500:</strong> Erro no servidor (login Instagram falhou)<br/>
            • <strong>Status 401:</strong> Credenciais inválidas<br/>
            • <strong>Status 429:</strong> Muitas requisições (rate limit)<br/>
            • <strong>Timeout:</strong> Instagram bloqueou o servidor do Vercel<br/>
            • <strong>CORS:</strong> Problema de permissões
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => testAPI()}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            🔄 Testar Novamente
          </button>
          
          <button 
            onClick={() => {
              const logs = document.querySelector('pre')?.textContent
              if (logs) {
                navigator.clipboard.writeText(logs)
                alert('✅ Logs copiados!')
              }
            }}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            📋 Copiar Logs
          </button>
        </div>
      </div>
    </div>
  )
}
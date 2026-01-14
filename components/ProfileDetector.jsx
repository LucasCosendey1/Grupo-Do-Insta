'use client';

import { useState } from 'react';

export default function ProfileDetector({ onProfileDetected }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const detectProfile = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      // Obter cookies do navegador
      const cookies = document.cookie;

      if (!cookies.includes('sessionid')) {
        setError('Você precisa estar logado no Instagram nesta aba');
        setShowInstructions(true);
        setIsDetecting(false);
        return;
      }

      // Enviar para API
      const response = await fetch('/api/detect-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cookies })
      });

      const data = await response.json();

      if (data.success) {
        onProfileDetected(data.profile);
      } else {
        setError(data.error || 'Não foi possível detectar o perfil');
        setShowInstructions(true);
      }

    } catch (err) {
      console.error('Erro na detecção:', err);
      setError('Erro ao detectar perfil. Tente novamente.');
      setShowInstructions(true);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={detectProfile}
        disabled={isDetecting}
        className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
      >
        {isDetecting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Detectando perfil...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>🔮 Detectar meu perfil automaticamente</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Como fazer funcionar:
          </h4>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold min-w-[20px]">1.</span>
              <span>Abra o <strong>Instagram</strong> em outra aba deste navegador</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold min-w-[20px]">2.</span>
              <span>Faça <strong>login</strong> na sua conta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold min-w-[20px]">3.</span>
              <span>Volte para esta página e clique em <strong>"Detectar perfil"</strong> novamente</span>
            </li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Seus dados ficam apenas no seu navegador, não são salvos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
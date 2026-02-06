// lib/image-utils.ts
import React from 'react';

// Valida se a URL parece uma imagem
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  if (url.trim() === '') return false
  
  return (
    url.startsWith('http://') || 
    url.startsWith('https://') || 
    url.startsWith('/api/image-proxy')
  )
}

// Verifica se é CDN do Instagram
export function isInstagramCDN(url: string): boolean {
  if (!url) return false;
  const cdnPatterns = [
    'instagram.com', 'cdninstagram.com', 'fbcdn.net',
    'scontent', 'scontent-', 'scontent.'
  ]
  const lowerUrl = url.toLowerCase()
  return cdnPatterns.some(pattern => lowerUrl.includes(pattern))
}

// Processa a URL para usar o Proxy
export function processInstagramImageUrl(url: string | null | undefined, username: string): string {
  // 1. Proteção contra username vazio
  if (!username || username === 'undefined') {
    return url || ''; 
  }

  // 2. Proteção contra URL vazia -> Retorna Avatar Genérico
  if (!url || url.length < 5 || url === 'null' || url === 'undefined') {
    return getGenericAvatar(username);
  }

  // 3. Se já for proxy ou blob, retorna igual
  if (url.startsWith('/api/image-proxy') || url.startsWith('blob:')) {
    return url;
  }

  try {
    const encodedUrl = encodeURIComponent(url);
    return `/api/image-proxy?url=${encodedUrl}&username=${username}`;
  } catch (e) {
    console.error('Erro ao processar URL:', e);
    return url;
  }
}

// Gera Avatar com iniciais
export function getGenericAvatar(username: string): string {
  const safeName = username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&size=200&background=00bfff&color=fff&bold=true`
}

// Handler de Erro para usar no onError da tag <img>
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>, 
  username: string
): void {
  const img = event.currentTarget
  
  // Evita loop infinito se o avatar genérico falhar
  if (img.src.includes('ui-avatars.com')) {
    return
  }
  
  // Substitui pelo avatar genérico
  img.src = getGenericAvatar(username)
}
/**
 * image-utils.ts
 * 
 * Utilitário para buscar imagens do Instagram no servidor e converter para Base64.
 * 
 * POR QUE BASE64?
 * - URLs do CDN do Instagram (scontent-*.cdninstagram.com) expiram em ~48h
 * - O CDN bloqueia requisições de browsers com CORS (cross-origin-resource-policy: same-origin)
 * - Salvando Base64 no banco: imagem permanente, sem proxy, sem CORS, sem custo
 * 
 * TAMANHO: foto de perfil ~150px → ~8-15KB em Base64. Totalmente viável em campo TEXT.
 */

/**
 * Faz fetch de uma imagem a partir de uma URL (do CDN do Instagram ou qualquer outra)
 * e retorna como string Base64 pronta para usar em <img src="...">.
 * 
 * Essa função roda APENAS no servidor (API routes do Next.js),
 * onde não existe bloqueio de CORS.
 * 
 * @param imageUrl - URL da imagem (ex: https://scontent-gru2-1.cdninstagram.com/...)
 * @returns string Base64 (ex: "data:image/jpeg;base64,/9j/4AAQ...") ou null se falhar
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null

  try {
    console.log('🖼️ [IMAGE] Fazendo fetch da imagem no servidor...')
    console.log('🖼️ [IMAGE] URL:', imageUrl.substring(0, 80) + '...')

    const response = await fetch(imageUrl, {
      headers: {
        // Headers necessários para o CDN do Instagram aceitar a requisição
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.instagram.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    })

    if (!response.ok) {
      console.warn(`⚠️ [IMAGE] Fetch falhou com status ${response.status}`)
      return null
    }

    // Detectar o tipo MIME da imagem (jpeg, png, webp, etc.)
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim()

    // Converter o body para ArrayBuffer e depois para Base64
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    const dataUrl = `data:${mimeType};base64,${base64}`

    console.log(`✅ [IMAGE] Convertida com sucesso!`)
    console.log(`   Tipo: ${mimeType}`)
    console.log(`   Tamanho: ${(buffer.length / 1024).toFixed(1)}KB → Base64: ${(base64.length / 1024).toFixed(1)}KB`)

    return dataUrl

  } catch (error) {
    console.error('❌ [IMAGE] Erro ao converter imagem para Base64:', error)
    return null
  }
}

/**
 * Verifica se uma string é um Base64 de imagem (já processado)
 * ou uma URL externa (ainda precisa processar).
 * 
 * Útil para evitar reprocessar imagens que já estão salvas no banco.
 */
export function isBase64Image(value: string): boolean {
  return value?.startsWith('data:image/')
}

/**
 * Verifica se uma URL é do CDN do Instagram (e portanto vai expirar/ter CORS).
 */
export function isInstagramCdnUrl(url: string): boolean {
  return url?.includes('cdninstagram.com') || url?.includes('fbcdn.net')
}
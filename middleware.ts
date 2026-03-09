import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🔧 MODO MANUTENÇÃO
// Para ATIVAR: mude para true
// Para DESATIVAR: mude para false
const MAINTENANCE_MODE = true

export function middleware(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    // Permite apenas a página de manutenção
    if (request.nextUrl.pathname === '/manutencao') {
      return NextResponse.next()
    }
    
    // Redireciona TODAS as outras páginas para /manutencao
    return NextResponse.redirect(new URL('/manutencao', request.url))
  }
  
  return NextResponse.next()
}

// Aplica o middleware em TODAS as rotas
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
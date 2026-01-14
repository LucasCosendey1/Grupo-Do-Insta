import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { cookies } = await request.json();
    
    if (!cookies) {
      return NextResponse.json(
        { error: 'Cookies não fornecidos' },
        { status: 400 }
      );
    }

    // Extrair sessionid do Instagram
    const sessionId = extractSessionId(cookies);
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Cookie de sessão do Instagram não encontrado' },
        { status: 400 }
      );
    }

    // Fazer requisição para o Instagram usando os cookies
    const profileData = await fetchInstagramProfile(sessionId, cookies);
    
    if (profileData.success) {
      return NextResponse.json({
        success: true,
        profile: {
          username: profileData.username,
          fullName: profileData.fullName,
          profilePicUrl: profileData.profilePicUrl,
          followersCount: profileData.followersCount,
          followingCount: profileData.followingCount,
          isVerified: profileData.isVerified
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Não foi possível detectar o perfil' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Erro ao detectar perfil:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar cookies',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function extractSessionId(cookies) {
  // Tentar diferentes formatos de cookies
  
  // Formato 1: String com todos os cookies
  if (typeof cookies === 'string') {
    const match = cookies.match(/sessionid=([^;]+)/);
    return match ? match[1] : null;
  }
  
  // Formato 2: Objeto com cookies separados
  if (typeof cookies === 'object' && cookies.sessionid) {
    return cookies.sessionid;
  }
  
  // Formato 3: Array de objetos de cookies
  if (Array.isArray(cookies)) {
    const sessionCookie = cookies.find(c => c.name === 'sessionid');
    return sessionCookie ? sessionCookie.value : null;
  }
  
  return null;
}

async function fetchInstagramProfile(sessionId, cookies) {
  try {
    // Construir string de cookies
    const cookieString = typeof cookies === 'string' 
      ? cookies 
      : `sessionid=${sessionId}`;

    // Fazer requisição para a API do Instagram
    const response = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=', {
      headers: {
        'cookie': cookieString,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-ig-app-id': '936619743392459',
        'x-asbd-id': '129477',
        'x-ig-www-claim': '0',
        'x-requested-with': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      // Tentar método alternativo - buscar dados da página inicial
      return await fetchProfileFromHome(cookieString);
    }

    const data = await response.json();
    
    if (data.data && data.data.user) {
      const user = data.data.user;
      return {
        success: true,
        username: user.username,
        fullName: user.full_name,
        profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
        followersCount: user.edge_followed_by?.count || 0,
        followingCount: user.edge_follow?.count || 0,
        isVerified: user.is_verified
      };
    }

    return { success: false };

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { success: false };
  }
}

async function fetchProfileFromHome(cookieString) {
  try {
    // Método alternativo: buscar da página inicial do Instagram
    const response = await fetch('https://www.instagram.com/', {
      headers: {
        'cookie': cookieString,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    
    // Extrair dados do script JSON embutido
    const scriptMatch = html.match(/<script type="application\/json" data-sjs>({.*?})<\/script>/);
    
    if (scriptMatch) {
      const data = JSON.parse(scriptMatch[1]);
      const viewerData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.viewer;
      
      if (viewerData && viewerData.user) {
        const user = viewerData.user;
        return {
          success: true,
          username: user.username,
          fullName: user.full_name,
          profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
          followersCount: user.edge_followed_by?.count || 0,
          followingCount: user.edge_follow?.count || 0,
          isVerified: user.is_verified || false
        };
      }
    }

    return { success: false };

  } catch (error) {
    console.error('Erro ao buscar perfil da home:', error);
    return { success: false };
  }
}
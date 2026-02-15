import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server-auth';
import { upsertIntegration } from '@/lib/integrations';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect(new URL('/settings/integrations?error=github_no_code', request.url));
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    const accessToken = tokenData.access_token;
    
    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    const githubUser = await userResponse.json();
    
    // Parse state to get user info (we'll use a simple approach for now)
    // In production, you'd want to use a proper state parameter with JWT or similar
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.redirect(new URL('/settings/integrations?error=unauthorized', request.url));
    }
    
    // Store the integration
    const metadata = {
      account: {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
      },
      scopes: tokenData.scope?.split(',') || ['repo', 'user'],
      linkedAt: new Date().toISOString(),
    };
    
    await upsertIntegration(user.id, 'github', accessToken, metadata);
    
    // Redirect back to settings page with success
    return NextResponse.redirect(new URL('/settings/integrations?success=github_connected', request.url));
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(new URL('/settings/integrations?error=github_auth_failed', request.url));
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server-auth';
import { upsertIntegration } from '@/lib/integrations';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=google_${error}`, request.url));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/settings/integrations?error=google_no_code', request.url));
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const googleUser = await userResponse.json();
    
    // Get user from request
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.redirect(new URL('/settings/integrations?error=unauthorized', request.url));
    }
    
    // Store both access and refresh tokens
    const tokenDataToStore = {
      access_token: accessToken,
      ...(refreshToken && { refresh_token: refreshToken }),
    };
    
    const metadata = {
      account: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
      scopes: tokenData.scope?.split(' ') || ['calendar.readonly', 'gmail.readonly'],
      linkedAt: new Date().toISOString(),
    };
    
    await upsertIntegration(user.id, 'google', JSON.stringify(tokenDataToStore), metadata);
    
    // Redirect back to settings page with success
    return NextResponse.redirect(new URL('/settings/integrations?success=google_connected', request.url));
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/settings/integrations?error=google_auth_failed', request.url));
  }
}
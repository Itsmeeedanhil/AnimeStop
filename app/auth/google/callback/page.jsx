'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Parse hash fragment for access_token or id_token
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const idToken = params.get('id_token');

        if (accessToken) {
          // Fetch user info from Google userinfo API
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!userInfoRes.ok) throw new Error('Failed to retrieve user info from Google');
          const googleUser = await userInfoRes.json();

          const authRes = await AuthApi.googleLogin({
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            google_id: googleUser.sub,
          });

          login(authRes.token, authRes.user);
          router.push('/library');
        } else if (idToken) {
          const authRes = await AuthApi.googleLogin({
            credential: idToken,
          });
          login(authRes.token, authRes.user);
          router.push('/library');
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Google callback error:', err);
        setError(err.message || 'Google authentication failed');
      }
    };

    handleGoogleCallback();
  }, [login, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
      {error ? (
        <div className="text-center p-6 bg-[#1E2020] border border-red-500/30 rounded-2xl max-w-md">
          <p className="text-sm text-red-300 font-bold mb-2">Google Authentication Error</p>
          <p className="text-xs text-[#99907c] mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50]"
          >
            Return Home
          </button>
        </div>
      ) : (
        <>
          <div className="w-12 h-12 border-4 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[#d0c5af]">Verifying Google credentials...</p>
        </>
      )}
    </div>
  );
}


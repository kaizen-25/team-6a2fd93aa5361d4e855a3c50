'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AuthForm from './AuthForm';

interface AuthGuardProps {
  children: (user: { userId: string; username: string }) => React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuth = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch('/api/auth/verify');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setSessionExpired(false);
          return;
        }
      }
      // Not authenticated
      if (user && isPolling) {
        // Was logged in but session expired
        setSessionExpired(true);
      }
      setUser(null);
    } catch {
      // Network error — don't logout on transient failures
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    checkAuth(false);
  }, [checkAuth]);

  // Poll session every 5 minutes
  useEffect(() => {
    if (user) {
      intervalRef.current = setInterval(() => {
        checkAuth(true);
      }, 5 * 60 * 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, checkAuth]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setUser(null);
    setSessionExpired(false);
  };

  const handleAuthSuccess = (authUser: { username: string }) => {
    // Re-verify to get full user data with userId
    checkAuth(false);
  };

  if (checking) {
    return (
      <div className="content-wrapper">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="search-spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-wrapper">
        {sessionExpired && (
          <div className="session-expired-banner">
            <span>⏱️</span> Your session has expired. Please log in again.
          </div>
        )}
        <AuthForm onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Authenticated — show user bar + children
  return (
    <div>
      <div className="auth-user-bar">
        <div className="auth-user-info">
          <div className="user-avatar">{user.username[0].toUpperCase()}</div>
          <span className="user-name">Logged in as <strong>{user.username}</strong></span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="logout-btn">
          Logout
        </button>
      </div>
      {children(user)}
    </div>
  );
}

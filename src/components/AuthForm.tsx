'use client';

import { useState, useMemo } from 'react';

interface AuthFormProps {
  onSuccess: (user: { username: string; email?: string }) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  // Real-time password validation
  const passwordRules = useMemo(() => {
    if (mode !== 'register') return [];
    const rules = [
      { label: 'At least 8 characters', valid: password.length >= 8 },
      { label: 'Contains a number', valid: /\d/.test(password) },
      { label: 'Contains a special character', valid: /[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]/.test(password) },
      { label: 'No common patterns (qwerty, 12345...)', valid: password.length > 0 && !containsCommonPattern(password) },
    ];
    return rules;
  }, [password, mode]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    return passwordRules.filter((r) => r.valid).length;
  }, [password, passwordRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });
        const data = await res.json();

        if (res.status === 429) {
          setRateLimitSeconds(data.retryAfterSeconds || 60);
          setError(`Too many login attempts. Please try again in ${data.retryAfterSeconds || 60} seconds.`);
          return;
        }

        if (res.ok) {
          onSuccess(data.user);
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();

        if (res.status === 429) {
          setRateLimitSeconds(data.retryAfterSeconds || 60);
          setError(`Too many registration attempts. Please try again in ${data.retryAfterSeconds || 60} seconds.`);
          return;
        }

        if (res.ok) {
          // Auto-login after registration
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            onSuccess(loginData.user);
          } else {
            // Registration succeeded but auto-login failed, switch to login
            setMode('login');
            setIdentifier(username);
            setError('Account created! Please log in.');
          }
        } else {
          setError(data.error || 'Registration failed');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper" id="auth-form">
      <div className="glass-card glass-card-accent auth-card">
        {/* Auth Icon */}
        <div className="auth-header">
          <div className="auth-icon">
            {mode === 'login' ? '🔑' : '✨'}
          </div>
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Sign in to raise and solve queries'
              : 'Join the IIT Ropar community'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className={`error-alert ${rateLimitSeconds > 0 ? '' : 'shake-once'}`}>
              {error}
            </div>
          )}

          {mode === 'login' ? (
            /* Login Fields */
            <div className="input-group mb-md">
              <label className="input-label" htmlFor="auth-identifier">
                Username or Email
              </label>
              <input
                id="auth-identifier"
                className="input"
                type="text"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          ) : (
            /* Register Fields */
            <>
              <div className="input-group mb-md">
                <label className="input-label" htmlFor="auth-username">
                  Username
                </label>
                <input
                  id="auth-username"
                  className="input"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <div className="input-group mb-md">
                <label className="input-label" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </>
          )}

          {/* Password Field */}
          <div className="input-group mb-md">
            <label className="input-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="input"
              type="password"
              placeholder={mode === 'login' ? 'Enter password' : 'Create a strong password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {/* Password Strength (Register only) */}
          {mode === 'register' && password.length > 0 && (
            <div className="password-feedback mb-md">
              <div className="password-strength-bar">
                <div
                  className={`password-strength-fill strength-${passwordStrength}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
              <div className="password-rules">
                {passwordRules.map((rule, i) => (
                  <div key={i} className={`password-rule ${rule.valid ? 'valid' : 'invalid'}`}>
                    <span className="rule-icon">{rule.valid ? '✅' : '❌'}</span>
                    {rule.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            id={mode === 'login' ? 'login-btn' : 'register-btn'}
          >
            {loading
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="auth-toggle">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button className="auth-toggle-btn" onClick={() => { setMode('register'); setError(''); }} id="switch-to-register">
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button className="auth-toggle-btn" onClick={() => { setMode('login'); setError(''); }} id="switch-to-login">
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Client-side common pattern check (matches server-side validation)
function containsCommonPattern(password: string): boolean {
  const lc = password.toLowerCase();
  const patterns = [
    'password', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
    'zxcvbn', '123456', '12345678', '111111', '000000',
    'abc123', 'abcdef', 'letmein', 'welcome', 'admin',
    'passw0rd', 'qwerty123', '1q2w3e4r', 'qazwsx',
  ];
  return patterns.some((p) => lc.includes(p));
}

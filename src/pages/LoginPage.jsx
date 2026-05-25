import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertTriangle, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 2FA login states
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');

  const { login, verify2FA, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Clear error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSubmitting(true);
    setOtpError('');
    const result = await login(email, password);
    setIsSubmitting(false);
    
    if (result === true) {
      navigate('/dashboard', { replace: true });
    } else if (result && result.requires2FA) {
      setRequires2FA(true);
      setTwoFactorMethod(result.method);
      setTempToken(result.tempToken);
    }
  };

  const handle2faSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode) return;

    setIsSubmitting(true);
    setOtpError('');
    const success = await verify2FA(tempToken, otpCode);
    setIsSubmitting(false);

    if (success) {
      navigate('/dashboard', { replace: true });
    } else {
      setOtpError('Verification failed. Please check the code or backup code.');
    }
  };

  const handleCancel2fa = () => {
    setRequires2FA(false);
    setTempToken('');
    setTwoFactorMethod('');
    setOtpCode('');
    setOtpError('');
    clearError();
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {requires2FA ? (
            /* ===== 2FA Verification View ===== */
            <>
              <div className="auth-header">
                <div className="auth-logo" style={{ backgroundColor: 'var(--accent-gold)' }}>
                  <ShieldCheck size={32} style={{ stroke: 'var(--primary-navy)' }} />
                </div>
                <h1>Two-Factor Verification</h1>
                <p>
                  Security code sent to your registered{' '}
                  <strong>{twoFactorMethod === 'sms' ? 'phone number via SMS' : 'email address'}</strong>.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '0.5rem', fontWeight: 600 }}>
                  *(Check the Node.js server console to view the mock OTP code)*
                </p>
              </div>

              {(otpError || error) && (
                <div className="auth-error">
                  <AlertTriangle size={16} />
                  <span>{otpError || error}</span>
                </div>
              )}

              <form onSubmit={handle2faSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="otpCode">Verification Code or Backup Code</label>
                  <input
                    id="otpCode"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP or backup code"
                    required
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: otpCode.length > 8 ? 'normal' : '0.15rem', fontSize: '1.1rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-accent auth-submit-btn"
                  disabled={isSubmitting || !otpCode}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={handleCancel2fa}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </button>
              </form>
            </>
          ) : (
            /* ===== Normal Login View ===== */
            <>
              <div className="auth-header">
                <div className="auth-logo">
                  <BookOpen size={32} />
                </div>
                <h1>Welcome Back</h1>
                <p>Sign in to your MVIT Question Paper Generator</p>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@mvit.edu.in"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-accent auth-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Don't have an account?{' '}
                  <Link to="/signup" className="auth-link">Sign Up</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
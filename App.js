import { useState, useEffect } from 'react';

// ── Backend API Configuration ────────────────────────────────────────────────
const API = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://secureme-backend-h0kx.onrender.com';

// ── Circular Gauge Component ─────────────────────────────────────────────────
function ScoreGauge({ score, size = 110, strokeWidth = 8, label = 'SCORE' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const validScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  const color = score === null || score === undefined
    ? '#94A3B8'
    : validScore >= 75
    ? '#10B981'
    : validScore >= 50
    ? '#F59E0B'
    : '#EF4444';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, lineHeight: 1, color: '#fff' }}>
          {score !== null && score !== undefined ? score : '--'}
        </span>
        {label && (
          <span style={{ fontSize: Math.max(9, size * 0.1), fontWeight: 700, letterSpacing: 1, opacity: 0.85, color: '#fff', marginTop: 2 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedUser = localStorage.getItem('secureme_user');
        return savedUser ? JSON.parse(savedUser) : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Auth States
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'otp'
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Health Score & Scan States
  const [cyberScore, setCyberScore] = useState(null);
  const [cyberStatus, setCyberStatus] = useState('');
  const [cyberRecommendations, setCyberRecommendations] = useState([]);
  const [scanLoading, setScanLoading] = useState(false);

  // Password Checker States
  const [pwInput, setPwInput] = useState('');
  const [pwResult, setPwResult] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCheck, setShowPwCheck] = useState(false);

  // Sync & Device States
  const [deviceId, setDeviceId] = useState('');
  const [syncData, setSyncData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [phoneId, setPhoneId] = useState('');

  // File Scanner States
  const [fileResult, setFileResult] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [copiedHash, setCopiedHash] = useState('');

  // App & Permissions Scanner States
  const [appScanResult, setAppScanResult] = useState(null);
  const [appScanLoading, setAppScanLoading] = useState(false);

  // Wi-Fi Analyzer States
  const [wifiSsid, setWifiSsid] = useState('SecureMe_Office_5G');
  const [wifiSecurity, setWifiSecurity] = useState('WPA3');
  const [wifiSignal, setWifiSignal] = useState(-55);
  const [wifiFreq, setWifiFreq] = useState(5000);
  const [wifiResult, setWifiResult] = useState(null);
  const [wifiLoading, setWifiLoading] = useState(false);

  // Security Tips Carousel
  const [tipIdx, setTipIdx] = useState(0);
  const tips = [
    { icon: '🔑', title: 'Use Strong Passwords', desc: 'Mix uppercase, numbers, and symbols. Never reuse passwords across portals.' },
    { icon: '📱', title: 'Review App Permissions', desc: 'Regularly audit apps requesting background location, mic, SMS, or camera access.' },
    { icon: '🛡️', title: 'Scan Files Before Opening', desc: 'Compute client-side SHA-256 hashes to cross-reference against 74 threat intelligence engines.' },
    { icon: '🔒', title: 'Enable Two-Factor Authentication', desc: '2FA stops over 99.9% of automated credential stuffing and phishing attacks.' },
    { icon: '📶', title: 'Beware of Rogue Wi-Fi Networks', desc: 'Avoid unencrypted open hotspots or use VPN protection on public connections.' },
  ];

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedPhoneId = localStorage.getItem('phoneId');
      if (savedPhoneId) {
        setPhoneId(savedPhoneId);
        fetchPhoneHistory(savedPhoneId);
      }
      const interval = setInterval(() => {
        const id = localStorage.getItem('phoneId');
        if (id) fetchPhoneHistory(id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAuthMessages = () => {
    setAuthError('');
    setAuthSuccess('');
  };

  const login = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) {
        if (data.needs_verification) {
          setAuthTab('verify');
          setAuthError(data.error);
        } else {
          setAuthError(data.error);
        }
      } else {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('secureme_user', JSON.stringify(data));
        }
        setUser(data);
      }
    } catch (e) {
      setAuthError('Connection error. Please check backend.');
    }
    setAuthLoading(false);
  };

  const register = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setAuthTab('verify');
        setOtpCode('');
        setAuthSuccess('📧 A 6-digit verification code has been sent to your email!');
        setPassword('');
      }
    } catch (e) {
      setAuthError('Connection error. Please try again.');
    }
    setAuthLoading(false);
  };

  const verifyEmail = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode })
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('secureme_user', JSON.stringify(data.user));
        }
        setUser(data.user);
      }
    } catch (e) {
      setAuthError('Verification failed. Please try again.');
    }
    setAuthLoading(false);
  };

  const resendVerification = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) setAuthError(data.error);
      else setAuthSuccess('📧 New 6-digit verification code sent!');
    } catch (e) {
      setAuthError('Failed to resend code.');
    }
    setAuthLoading(false);
  };

  const forgotPassword = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setResetStep('otp');
        setAuthSuccess('📧 A 6-digit reset code has been sent to your email.');
      }
    } catch (e) {
      setAuthError('Failed to send reset code.');
    }
    setAuthLoading(false);
  };

  const resetPassword = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetOtp, new_password: newPassword })
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setAuthTab('login');
        setResetStep('email');
        setResetOtp('');
        setNewPassword('');
        setAuthSuccess('✅ Password reset successful! You can now log in.');
      }
    } catch (e) {
      setAuthError('Failed to reset password.');
    }
    setAuthLoading(false);
  };

  const logout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('secureme_user');
      localStorage.removeItem('phoneId');
    }
    setUser(null);
    setPhoneHistory([]);
    setPhoneId('');
    setTab('home');
    clearAuthMessages();
  };

  // Instant Health Scan Trigger
  const runInstantHealthScan = async () => {
    setScanLoading(true);
    try {
      const res = await fetch(`${API}/cyber-health-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'SecureUser@2026!',
          installed_apps: ['com.whatsapp', 'com.google.android.apps.photos', 'com.phone.cleaner.fast']
        })
      });
      const data = await res.json();
      setCyberScore(data.score);
      setCyberStatus(data.status);
      setCyberRecommendations(data.recommendations || []);

      // If phone linked, save scan record
      const linked = phoneId || (typeof localStorage !== 'undefined' ? localStorage.getItem('phoneId') : '');
      if (linked) {
        await fetch(`${API}/save-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: linked,
            scan_type: 'Full Cyber Audit',
            score: data.score,
            status: data.status,
            details: `Scanned password health & 3 apps. ${data.risky_apps?.length || 0} risk(s) identified.`
          })
        });
        fetchPhoneHistory(linked);
      }
    } catch (e) {
      setCyberScore(70);
      setCyberStatus('Moderate ⚠️');
      setCyberRecommendations(['🔑 Strengthen master password', '📱 Audit recently installed apps']);
    }
    setScanLoading(false);
  };

  // Password Checker
  const checkPassword = async () => {
    if (!pwInput) return;
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/check-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput })
      });
      setPwResult(await res.json());
    } catch (e) {
      let s = 0;
      const sugg = [];
      if (pwInput.length >= 8) s += 25; else sugg.push('Use at least 8 characters');
      if (/[A-Z]/.test(pwInput)) s += 25; else sugg.push('Add uppercase letters (A-Z)');
      if (/[0-9]/.test(pwInput)) s += 25; else sugg.push('Add numbers (0-9)');
      if (/[!@#$%^&*(),.?":{}|<>]/.test(pwInput)) s += 25; else sugg.push('Add special characters (!@#$...)');
      setPwResult({
        score: s,
        strength: s >= 75 ? 'Strong 💪' : s >= 50 ? 'Moderate ⚠️' : 'Weak ❌',
        suggestions: sugg
      });
    }
    setPwLoading(false);
  };

  // Sync Fetcher
  const fetchSync = async () => {
    if (!deviceId) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`${API}/get-scans/${deviceId}`);
      setSyncData(await res.json());
    } catch (e) {
      setSyncData({ total: 0, scans: [] });
    }
    setSyncLoading(false);
  };

  const fetchPhoneHistory = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API}/get-scans/${id}`);
      const data = await res.json();
      setPhoneHistory(data.scans || []);
    } catch (e) {}
  };

  // File Scanner
  const scanFile = async () => {
    if (!selectedFiles.length) return;
    setFileLoading(true);
    setFileResult(null);
    const results = [];
    for (const file of selectedFiles) {
      try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const res = await fetch(`${API}/scan-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_hash: hash, file_name: file.name })
        });
        const data = await res.json();
        results.push({ ...data, hash, fileName: file.name, size: (file.size / 1024).toFixed(1) });
      } catch (e) {
        results.push({ error: 'Scan failed', fileName: file.name });
      }
    }
    setFileResult(results);
    setFileLoading(false);
  };

  // App & Permissions Scanner
  const scanAppPermissions = async () => {
    setAppScanLoading(true);
    try {
      const sampleApps = [
        {
          name: 'WhatsApp Messenger',
          package: 'com.whatsapp',
          permissions: ['android.permission.CAMERA', 'android.permission.READ_CONTACTS', 'android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION']
        },
        {
          name: 'System Cleaner Pro',
          package: 'com.phone.cleaner.fast',
          permissions: ['android.permission.PACKAGE_USAGE_STATS', 'android.permission.BIND_ACCESSIBILITY_SERVICE', 'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.REQUEST_INSTALL_PACKAGES']
        },
        {
          name: 'Super Free VPN',
          package: 'com.free.vpn.super',
          permissions: ['android.permission.BIND_VPN_SERVICE', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.READ_PHONE_STATE', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.FOREGROUND_SERVICE']
        }
      ];

      const [permRes, appRes] = await Promise.all([
        fetch(`${API}/analyze-permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apps: sampleApps })
        }).then(r => r.json()),
        fetch(`${API}/scan-apps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apps: sampleApps.map(a => a.package) })
        }).then(r => r.json())
      ]);

      setAppScanResult({ permissions: permRes, apps: appRes });
    } catch (e) {
      setAppScanResult({ error: 'Failed to inspect apps. Ensure backend is active.' });
    }
    setAppScanLoading(false);
  };

  // Wi-Fi Security Scanner
  const scanWifiSecurity = async () => {
    setWifiLoading(true);
    try {
      const res = await fetch(`${API}/analyze-wifi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssid: wifiSsid,
          security_type: wifiSecurity,
          signal_strength: Number(wifiSignal),
          frequency: Number(wifiFreq)
        })
      });
      setWifiResult(await res.json());
    } catch (e) {
      setWifiResult({ error: 'Failed to analyze Wi-Fi security.' });
    }
    setWifiLoading(false);
  };

  const scoreColor = (s) => s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';

  const copyToClipboard = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(''), 2500);
    }
  };

  // ── AUTHENTICATION SCREEN ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #311042 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 24, padding: '40px 32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.35)', animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Header Brand */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg, #4B4FD9 0%, #7B5EA7 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, boxShadow: '0 8px 16px rgba(75, 79, 217, 0.3)', marginBottom: 12 }}>
              🛡️
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>SecureMe</div>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginTop: 2 }}>AI-Driven Mobile Security Analyzer</div>
          </div>

          {/* Tab Switcher — only shown on Login / Register */}
          {authTab !== 'forgot' && authTab !== 'verify' && (
            <div style={{ display: 'flex', marginBottom: 24, background: '#F1F5F9', borderRadius: 12, padding: 4 }}>
              {['login', 'register'].map(t => (
                <button
                  key={t}
                  onClick={() => { setAuthTab(t); clearAuthMessages(); }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    border: 'none',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    background: authTab === t ? '#4B4FD9' : 'transparent',
                    color: authTab === t ? '#FFFFFF' : '#64748B',
                    boxShadow: authTab === t ? '0 2px 6px rgba(75, 79, 217, 0.3)' : 'none'
                  }}
                >
                  {t === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>
          )}

          {/* ── VERIFY EMAIL OTP ── */}
          {authTab === 'verify' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>📬</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A' }}>Enter Verification Code</div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                  We sent a 6-digit verification code to:
                </div>
                <div style={{ fontWeight: 700, color: '#4B4FD9', fontSize: 14, marginTop: 4 }}>{email}</div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>6-Digit OTP Code</div>
              <input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: '2px solid #E2E8F0',
                  fontSize: 22,
                  textAlign: 'center',
                  letterSpacing: 8,
                  fontWeight: 800,
                  color: '#0F172A',
                  marginBottom: 16
                }}
              />

              {authError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>{authError}</div>}
              {authSuccess && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#10B981', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 14 }}>{authSuccess}</div>}

              <button
                onClick={verifyEmail}
                disabled={authLoading || otpCode.length < 6}
                style={{
                  width: '100%',
                  padding: 14,
                  background: otpCode.length === 6 ? '#4B4FD9' : '#CBD5E1',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: otpCode.length === 6 ? 'pointer' : 'not-allowed',
                  marginBottom: 10
                }}
              >
                {authLoading ? 'Verifying...' : '✅ Verify & Log In'}
              </button>

              <button
                onClick={resendVerification}
                disabled={authLoading}
                style={{ width: '100%', padding: 10, background: 'none', color: '#4B4FD9', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}
              >
                🔄 Resend Code
              </button>
              <button
                onClick={() => { setAuthTab('login'); clearAuthMessages(); }}
                style={{ width: '100%', padding: 10, background: 'none', color: '#64748B', border: '1.5px solid #E2E8F0', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                ← Back to Login
              </button>
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {authTab === 'forgot' && (
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>🔑 Reset Password</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                {resetStep === 'email' ? 'Enter your email to receive a 6-digit reset code.' : 'Enter the 6-digit code and your new password.'}
              </div>

              {resetStep === 'email' ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email</div>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 18 }}
                  />

                  {authError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authError}</div>}
                  {authSuccess && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#10B981', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authSuccess}</div>}

                  <button
                    onClick={forgotPassword}
                    disabled={authLoading || !email}
                    style={{ width: '100%', padding: 13, background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}
                  >
                    {authLoading ? 'Sending...' : '📧 Send 6-Digit Code'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>6-Digit Reset Code</div>
                  <input
                    value={resetOtp}
                    onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 18, textAlign: 'center', letterSpacing: 4, fontWeight: 700, marginBottom: 14 }}
                  />

                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>New Password</div>
                  <input
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    type="password"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 18 }}
                  />

                  {authError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authError}</div>}
                  {authSuccess && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#10B981', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authSuccess}</div>}

                  <button
                    onClick={resetPassword}
                    disabled={authLoading || resetOtp.length < 6 || newPassword.length < 6}
                    style={{ width: '100%', padding: 13, background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}
                  >
                    {authLoading ? 'Updating...' : '🔐 Set New Password'}
                  </button>
                </>
              )}

              <button
                onClick={() => { setAuthTab('login'); setResetStep('email'); clearAuthMessages(); }}
                style={{ width: '100%', padding: 10, background: 'none', color: '#64748B', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back to Login
              </button>
            </div>
          )}

          {/* ── REGISTER ── */}
          {authTab === 'register' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Full Name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 14 }}
              />

              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email</div>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 14 }}
              />

              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Password</div>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  type={showPassword ? 'text' : 'password'}
                  style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {authError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authError}</div>}
              {authSuccess && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#10B981', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authSuccess}</div>}

              <button
                onClick={register}
                disabled={authLoading}
                style={{ width: '100%', padding: 13, background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                {authLoading ? 'Creating account...' : '📝 Register'}
              </button>
            </div>
          )}

          {/* ── LOGIN ── */}
          {authTab === 'login' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email</div>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 14 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Password</div>
                <button
                  onClick={() => { setAuthTab('forgot'); clearAuthMessages(); }}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#4B4FD9', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                  style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {authError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authError}</div>}
              {authSuccess && <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#10B981', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{authSuccess}</div>}

              <button
                onClick={login}
                disabled={authLoading}
                style={{ width: '100%', padding: 13, background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                {authLoading ? 'Please wait...' : '🔐 Login'}
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── MAIN APPLICATION ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F9', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top App Header */}
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #4B4FD9 0%, #7B5EA7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 4px 10px rgba(75, 79, 217, 0.25)' }}>
            🛡️
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>SecureMe</div>
            <div className="hide-on-mobile" style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>AI-Driven Mobile Security Analyzer</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>👤 {user.name || user.email}</span>
          <button
            onClick={logout}
            style={{
              padding: '7px 14px',
              background: '#FEF2F2',
              color: '#EF4444',
              border: '1px solid #FECACA',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', padding: '0 16px', overflowX: 'auto' }}>
        {[
          ['home', '🏠 Dashboard'],
          ['password', '🔑 Password'],
          ['files', '📁 File Scan'],
          ['apps', '🛡️ App Scanner'],
          ['wifi', '📶 Wi-Fi Scan'],
          ['sync', '🔄 Sync'],
          ['about', 'ℹ️ About']
        ].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#4B4FD9' : '#64748B',
              borderBottom: tab === t ? '3px solid #4B4FD9' : '3px solid transparent',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ maxWidth: 860, width: '100%', margin: '0 auto', padding: '24px 16px', flex: 1 }}>

        {/* ── TAB: HOME / DASHBOARD ── */}
        {tab === 'home' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Hero Cyber Health Card */}
            <div style={{
              background: 'linear-gradient(135deg, #3730A3 0%, #4B4FD9 50%, #7B5EA7 100%)',
              borderRadius: 24,
              padding: '28px 32px',
              color: '#FFFFFF',
              boxShadow: '0 12px 30px -5px rgba(75, 79, 217, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>
                    CYBER HEALTH STATUS
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, margin: '6px 0 4px', letterSpacing: -0.5 }}>
                    {cyberScore === null ? 'Ready to Scan' : cyberScore >= 75 ? 'Safe & Shielded' : cyberScore >= 50 ? 'Moderate Risk' : 'Action Required'}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.4 }}>
                    {cyberScore === null
                      ? `Welcome back, ${user.name || user.email.split('@')[0]}! Run an instant cyber posture evaluation.`
                      : cyberStatus}
                  </div>

                  {cyberRecommendations.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cyberRecommendations.map((rec, i) => (
                        <div key={i} style={{ fontSize: 13, background: 'rgba(255, 255, 255, 0.12)', padding: '6px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          • {rec}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={runInstantHealthScan}
                      disabled={scanLoading}
                      style={{
                        background: '#FFFFFF',
                        color: '#4B4FD9',
                        border: 'none',
                        borderRadius: 12,
                        padding: '12px 26px',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      {scanLoading ? '⏳ Running AI Evaluation...' : '▶ Run Instant Scan'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ScoreGauge score={cyberScore} size={120} strokeWidth={9} label="HEALTH" />
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: 16 }}>
                <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '10px 4px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{phoneHistory.length}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Total Scans</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '10px 4px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#6EE7B7' }}>{phoneHistory.filter(s => s.score >= 75).length}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Safe Scans</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: '10px 4px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#FCA5A5' }}>{phoneHistory.filter(s => s.score < 75).length}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Risks Found</div>
                </div>
              </div>
            </div>

            {/* Security Tips Carousel */}
            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💡 Security Best Practices
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setTipIdx((tipIdx - 1 + tips.length) % tips.length)}
                    style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setTipIdx((tipIdx + 1) % tips.length)}
                    style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div style={{ background: '#EEF2FF', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 32 }}>{tips[tipIdx].icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{tips[tipIdx].title}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{tips[tipIdx].desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                {tips.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setTipIdx(i)}
                    style={{
                      width: i === tipIdx ? 22 : 8,
                      height: 6,
                      borderRadius: 4,
                      background: i === tipIdx ? '#4B4FD9' : '#CBD5E1',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                Security Overview & Quick Tools
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                
                <div
                  onClick={() => setTab('apps')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1.5px solid #E2E8F0', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Apps/Safe</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>Inspect Permissions →</div>
                </div>

                <div
                  onClick={() => setTab('password')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1.5px solid #F59E0B', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>🔑</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Password/Check</div>
                  <div style={{ fontWeight: 700, color: '#D97706', fontSize: 14 }}>Check Now →</div>
                </div>

                <div
                  onClick={() => setTab('files')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1.5px solid #4B4FD9', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Files/Scan</div>
                  <div style={{ fontWeight: 700, color: '#4B4FD9', fontSize: 14 }}>Scan any file →</div>
                </div>

                <div
                  onClick={() => setTab('wifi')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 18, border: '1.5px solid #10B981', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📶</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Wi-Fi/Network</div>
                  <div style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>Audit Wi-Fi →</div>
                </div>

              </div>
            </div>

            {/* Linked Phone Scan History */}
            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 22, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📱 Phone Scan History
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {phoneId ? `Device ID: ${phoneId}` : 'Sync scan results directly from your Android phone'}
                  </div>
                </div>
                {phoneId && (
                  <button
                    onClick={() => fetchPhoneHistory(phoneId)}
                    style={{ padding: '6px 14px', background: '#EEF2FF', color: '#4B4FD9', border: '1px solid #C7D2FE', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >
                    🔄 Refresh
                  </button>
                )}
              </div>

              {phoneHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {phoneHistory.map((scan, i) => {
                    const color = scoreColor(scan.score);
                    return (
                      <div
                        key={i}
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 14,
                          padding: 16,
                          border: `1.5px solid ${color}40`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 16
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>{scan.scan_type}</div>
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{scan.created_at?.slice(0, 16).replace('T', ' ')}</div>
                          <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{scan.details}</div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '8px 16px', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color }}>{scan.score}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>/100</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 18, border: '1px dashed #CBD5E1' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Link Device to View Mobile Telemetry</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={phoneId}
                      onChange={e => setPhoneId(e.target.value)}
                      placeholder="Enter Device ID from SecureMe app → Profile"
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13 }}
                    />
                    <button
                      onClick={() => {
                        if (typeof localStorage !== 'undefined') {
                          localStorage.setItem('phoneId', phoneId);
                        }
                        fetchPhoneHistory(phoneId);
                      }}
                      style={{ padding: '10px 20px', background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                    >
                      Link Phone
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── TAB: PASSWORD CHECKER ── */}
        {tab === 'password' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>🔑</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Password Checker</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Verify credential complexity against NIST guidelines and modern brute-force dictionaries.
            </div>

            {pwResult && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                  borderRadius: 20,
                  padding: '20px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(49, 46, 129, 0.25)'
                }}>
                  <ScoreGauge score={pwResult.score} size={100} strokeWidth={8} label="STRENGTH" />
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.8, textTransform: 'uppercase' }}>EVALUATION</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(pwResult.score) }}>{pwResult.strength}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{pwResult.score >= 75 ? 'Resistant to rainbow table attacks' : 'Susceptible to fast dictionary attacks'}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Enter Password to Analyze</div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showPwCheck ? 'text' : 'password'}
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && checkPassword()}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  borderRadius: 12,
                  border: '1.5px solid #E2E8F0',
                  fontSize: 15,
                  fontWeight: 500
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwCheck(!showPwCheck)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
              >
                {showPwCheck ? '🙈' : '👁️'}
              </button>
            </div>

            <button
              onClick={checkPassword}
              disabled={pwLoading || !pwInput}
              style={{
                width: '100%',
                padding: 14,
                background: pwInput ? '#4B4FD9' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: pwInput ? 'pointer' : 'not-allowed',
                boxShadow: pwInput ? '0 4px 12px rgba(75, 79, 217, 0.3)' : 'none'
              }}
            >
              {pwLoading ? '🔍 Analyzing entropy...' : '🔍 Analyze Password'}
            </button>

            {/* Checklist Matrix */}
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {[
                { test: pwInput.length >= 8, label: 'At least 8 characters' },
                { test: /[A-Z]/.test(pwInput), label: 'Uppercase letters (A-Z)' },
                { test: /[0-9]/.test(pwInput), label: 'Numeric digits (0-9)' },
                { test: /[!@#$%^&*(),.?":{}|<>]/.test(pwInput), label: 'Special symbols (!@#$)' }
              ].map((crit, i) => (
                <div key={i} style={{ background: crit.test ? '#ECFDF5' : '#F8FAFC', border: `1px solid ${crit.test ? '#A7F3D0' : '#E2E8F0'}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: crit.test ? '#065F46' : '#64748B' }}>
                  <span>{crit.test ? '✅' : '⚪'}</span>
                  <span style={{ fontWeight: crit.test ? 700 : 500 }}>{crit.label}</span>
                </div>
              ))}
            </div>

            {pwResult && pwResult.suggestions && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginBottom: 10 }}>Security Suggestions</div>
                {pwResult.score >= 75 && (
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 13, color: '#065F46' }}>
                    ✅ Good mix of characters. High entropy.
                  </div>
                )}
                {pwResult.suggestions.map((s, i) => (
                  <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 13, color: '#92400E' }}>
                    ⚠️ {s}
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#EEF2FF', borderRadius: 12, padding: 12, fontSize: 12, color: '#4B4FD9', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔒</span>
              <span>Evaluated client-side and securely verified. Passwords are never logged or stored.</span>
            </div>
          </div>
        )}

        {/* ── TAB: FILE SCANNER ── */}
        {tab === 'files' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>📁</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>File Scanner</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Inspect APKs, PDFs, and executables for malware via local SHA-256 computation against VirusTotal (74 engines).
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              style={{
                border: '2px dashed #4B4FD9',
                borderRadius: 16,
                padding: '36px 20px',
                textAlign: 'center',
                marginBottom: 20,
                background: '#F8FAFC',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                setSelectedFiles(Array.from(e.dataTransfer.files));
                setFileResult(null);
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 16, marginBottom: 4 }}>Drag & drop files here</div>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 18 }}>Supports APKs, Binaries, Documents & Media (Multi-file batch)</div>
              
              <input
                type="file"
                id="fileInput"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  setSelectedFiles(Array.from(e.target.files));
                  setFileResult(null);
                }}
              />
              <label
                htmlFor="fileInput"
                style={{
                  padding: '11px 26px',
                  background: '#4B4FD9',
                  color: '#FFFFFF',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'inline-block',
                  boxShadow: '0 4px 10px rgba(75, 79, 217, 0.25)'
                }}
              >
                Browse Files
              </label>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                  {selectedFiles.length} file(s) selected:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedFiles.map((f, i) => (
                    <div key={i} style={{ background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>📄</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{(f.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                        style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer' }}
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={scanFile}
              disabled={!selectedFiles.length || fileLoading}
              style={{
                width: '100%',
                padding: 14,
                background: selectedFiles.length ? '#4B4FD9' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: selectedFiles.length ? 'pointer' : 'not-allowed',
                boxShadow: selectedFiles.length ? '0 4px 12px rgba(75, 79, 217, 0.3)' : 'none'
              }}
            >
              {fileLoading ? `🔍 Scanning ${selectedFiles.length} file(s) with 74 engines...` : '🔍 Scan Files'}
            </button>

            {/* Results */}
            {fileResult && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fileResult.map((r, i) => r.error ? (
                  <div key={i} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, color: '#EF4444' }}>
                    ❌ {r.fileName}: {r.error}
                  </div>
                ) : (
                  <div
                    key={i}
                    style={{
                      background: r.is_malicious ? '#FEF2F2' : '#ECFDF5',
                      border: `1.5px solid ${r.is_malicious ? '#FECACA' : '#A7F3D0'}`,
                      borderRadius: 16,
                      padding: 20
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 32 }}>{r.is_malicious ? '🚨' : '✅'}</div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: r.is_malicious ? '#EF4444' : '#10B981' }}>
                            {r.is_malicious ? 'Malware Detected!' : 'File is Clean'}
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                            {r.fileName} • {r.size} KB • {r.status}
                          </div>
                        </div>
                      </div>
                      <div style={{ background: '#FFFFFF', padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: r.is_malicious ? '#EF4444' : '#10B981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        {r.malicious_count ?? 0}/{r.total_engines ?? 74} Detections
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.7)', borderRadius: 10, padding: 12, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', wordBreak: 'break-all' }}>
                        SHA-256: {r.hash}
                      </div>
                      <button
                        onClick={() => copyToClipboard(r.hash)}
                        style={{ padding: '4px 10px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {copiedHash === r.hash ? 'Copied! ✓' : '📋 Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#EEF2FF', borderRadius: 12, padding: 14, marginTop: 20, fontSize: 13, color: '#4B4FD9' }}>
              💡 <strong>Zero-Cloud Privacy:</strong> SHA-256 cryptographic hashes are calculated entirely in your browser using the native Web Crypto API. Raw files never leave your device.
            </div>
          </div>
        )}

        {/* ── TAB: ANDROID APP & PERMISSIONS SCANNER ── */}
        {tab === 'apps' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>🛡️</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Android App & Permissions Analyzer</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
              Simulate and inspect installed Android APK packages against 70+ dangerous permission indicators (Accessibility overlay, keyloggers, location tracking, silently granted SMS).
            </div>

            <button
              onClick={scanAppPermissions}
              disabled={appScanLoading}
              style={{
                width: '100%',
                padding: 14,
                background: '#4B4FD9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: 20,
                boxShadow: '0 4px 12px rgba(75, 79, 217, 0.3)'
              }}
            >
              {appScanLoading ? '🔍 Inspecting Android Permissions...' : '🔍 Run Deep Permission Audit'}
            </button>

            {appScanResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {appScanResult.apps && (
                  <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 18, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Known Malicious Signatures</div>
                      <div style={{ background: appScanResult.apps.risky_count > 0 ? '#FEF2F2' : '#ECFDF5', color: appScanResult.apps.risky_count > 0 ? '#EF4444' : '#10B981', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {appScanResult.apps.status}
                      </div>
                    </div>

                    {appScanResult.apps.risky_apps?.map((ra, i) => (
                      <div key={i} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>🚨</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#991B1B', fontSize: 14 }}>{ra.package}</div>
                          <div style={{ fontSize: 12, color: '#B91C1C' }}>{ra.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {appScanResult.permissions && appScanResult.permissions.apps && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 12 }}>
                      Dangerous Permissions Breakdown ({appScanResult.permissions.total_apps_scanned} Apps Scanned)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {appScanResult.permissions.apps.map((app, idx) => (
                        <div key={idx} style={{ background: '#FFFFFF', borderRadius: 14, padding: 16, border: '1.5px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>{app.name}</div>
                              <div style={{ fontSize: 12, color: '#64748B' }}>{app.package}</div>
                            </div>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              background: app.risk_level === 'Critical' ? '#FEF2F2' : app.risk_level === 'High' ? '#FFFBEB' : '#ECFDF5',
                              color: app.risk_level === 'Critical' ? '#EF4444' : app.risk_level === 'High' ? '#D97706' : '#10B981'
                            }}>
                              {app.risk_level} Risk ({app.dangerous_count} perms)
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                            {app.dangerous_permissions?.map((p, pIdx) => (
                              <div key={pIdx} style={{ fontSize: 12, background: '#F8FAFC', padding: '6px 10px', borderRadius: 8, color: '#334155' }}>
                                ⚠️ <strong>{p.permission}</strong>: {p.description}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: WI-FI SECURITY ANALYZER ── */}
        {tab === 'wifi' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>📶</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Wi-Fi & Network Security Analyzer</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
              Evaluate wireless access points against rogue evil-twin honeypots, outdated WEP/WPA encryption, and signal degradation.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>SSID Network Name</label>
                <input
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', marginTop: 4, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Encryption Standard</label>
                <select
                  value={wifiSecurity}
                  onChange={e => setWifiSecurity(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', marginTop: 4, fontSize: 13, background: '#fff' }}
                >
                  <option value="WPA3">WPA3 (Enterprise / Modern)</option>
                  <option value="WPA2">WPA2 (Standard AES)</option>
                  <option value="WPA">WPA (Legacy TKIP)</option>
                  <option value="WEP">WEP (Insecure)</option>
                  <option value="OPEN">OPEN (Unencrypted Hotspot)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Signal Strength (dBm)</label>
                <input
                  type="number"
                  value={wifiSignal}
                  onChange={e => setWifiSignal(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', marginTop: 4, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Frequency</label>
                <select
                  value={wifiFreq}
                  onChange={e => setWifiFreq(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', marginTop: 4, fontSize: 13, background: '#fff' }}
                >
                  <option value={5000}>5 GHz (High Throughput)</option>
                  <option value={2400}>2.4 GHz (Long Range)</option>
                </select>
              </div>
            </div>

            <button
              onClick={scanWifiSecurity}
              disabled={wifiLoading}
              style={{
                width: '100%',
                padding: 13,
                background: '#4B4FD9',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                marginBottom: 20
              }}
            >
              {wifiLoading ? '🔍 Analyzing Packet Enclaves...' : '🔍 Audit Wi-Fi Posture'}
            </button>

            {wifiResult && (
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 20, border: `1.5px solid ${scoreColor(wifiResult.score)}50` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{wifiResult.ssid}</div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>{wifiResult.status} • {wifiResult.security_type}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '8px 16px', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(wifiResult.score) }}>{wifiResult.score}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>/100</div>
                  </div>
                </div>

                {wifiResult.risks && wifiResult.risks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {wifiResult.risks.map((risk, i) => (
                      <div key={i} style={{ background: '#FFFFFF', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#334155', border: '1px solid #E2E8F0' }}>
                        {risk}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 13, fontWeight: 700, color: '#4B4FD9' }}>
                  Recommendation: {wifiResult.recommendation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SYNC RESULTS ── */}
        {tab === 'sync' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>🔄</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Sync Results</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              Enter your Android Device ID to retrieve and synchronize historical audit logs from your phone.
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                value={deviceId}
                onChange={e => setDeviceId(e.target.value)}
                placeholder="Find in SecureMe app → Profile → Device ID"
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14 }}
              />
            </div>

            <button
              onClick={fetchSync}
              disabled={syncLoading || !deviceId}
              style={{
                width: '100%',
                padding: 14,
                background: deviceId ? '#4B4FD9' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: deviceId ? 'pointer' : 'not-allowed',
                marginBottom: 24
              }}
            >
              {syncLoading ? 'Fetching telemetry...' : '🔄 Fetch My Scans'}
            </button>

            {syncData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                  {syncData.total} scan(s) found
                </div>
                {(syncData.scans || []).map((scan, i) => (
                  <div
                    key={i}
                    style={{
                      border: `1.5px solid ${scoreColor(scan.score)}40`,
                      borderRadius: 14,
                      padding: 16,
                      background: '#F8FAFC',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>{scan.scan_type}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{scan.created_at?.slice(0, 16).replace('T', ' ')}</div>
                      <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{scan.details}</div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '8px 16px', borderRadius: 12 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(scan.score) }}>{scan.score}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>/100</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#EEF2FF', borderRadius: 12, padding: 14, fontSize: 13, color: '#4B4FD9', marginTop: 16 }}>
              💡 Find your Device ID: Open SecureMe app → Profile tab
            </div>
          </div>
        )}

        {/* ── TAB: ABOUT ── */}
        {tab === 'about' && (
          <div className="animate-fade-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 26 }}>ℹ️</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>About SecureMe</div>
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
              AI-Driven Mobile Security Analyzer & DevSecOps Platform
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['📁', 'File Scanner', 'Upload any file — SHA-256 + VirusTotal (74 engines)'],
                ['🛡️', 'Permission Analyzer', 'Detects 70+ dangerous permissions across all installed apps'],
                ['🔑', 'Password Checker', 'Real-time strength analysis with improvement suggestions'],
                ['📊', 'Cyber Health Score', 'AI-weighted score (0-100): Safe, Moderate, or High Risk'],
                ['🔋', 'Battery & Performance', 'Monitors RAM usage, temperature, and running processes'],
                ['📶', 'Wi-Fi Threat Auditor', 'Detects unencrypted open networks and rogue access point honeypots']
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 28 }}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg, #4B4FD9 0%, #7B5EA7 100%)', borderRadius: 16, color: '#FFFFFF', textAlign: 'center', boxShadow: '0 8px 20px rgba(75, 79, 217, 0.3)' }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>SecureMe Architecture Stack</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Kotlin + Jetpack Compose • React Native • FastAPI • PostgreSQL • VirusTotal API • Brevo • SHA-256 Web Crypto
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '16px 24px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
        SecureMe © 2026 • AI-Driven DevSecOps & Mobile Vulnerability Platform
      </footer>

    </div>
  );
}
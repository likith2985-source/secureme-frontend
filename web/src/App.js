import { useState, useEffect } from 'react';

// ── Backend API Configuration ────────────────────────────────────────────────
const API = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://secureme-backend-h0kx.onrender.com';

// Color helper for scores
const scoreColor = (s) => (s === null || s === undefined) ? '#94A3B8' : s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';

// Dual-endpoint resilient fetcher (automatically fails over between local and cloud backend)
async function apiFetch(endpoint, options = {}) {
  const primary = API;
  const secondary = API.includes('localhost')
    ? 'https://secureme-backend-h0kx.onrender.com'
    : 'http://localhost:8000';

  try {
    const res = await fetch(`${primary}${endpoint}`, options);
    if (res.ok) return res;
    // Fall back to secondary if primary gave a 404/5xx error
    try {
      const resSec = await fetch(`${secondary}${endpoint}`, options);
      if (resSec.ok) return resSec;
    } catch (_) {}
    return res;
  } catch (err) {
    try {
      return await fetch(`${secondary}${endpoint}`, options);
    } catch {
      throw err;
    }
  }
}

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

  // Health Score & Mobile Synced States
  const [cyberScore, setCyberScore] = useState(null);
  const [cyberStatus, setCyberStatus] = useState('Syncing from mobile app...');
  const [cyberRecommendations, setCyberRecommendations] = useState([]);
  const [syncedDevice, setSyncedDevice] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const u = localStorage.getItem('secureme_user');
        const parsed = u ? JSON.parse(u) : null;
        const savedEmail = parsed?.email;
        return (
          (savedEmail && localStorage.getItem(`secureme_device_${savedEmail}`)) ||
          localStorage.getItem('synced_device') ||
          localStorage.getItem('phoneId') ||
          parsed?.device_id ||
          ''
        );
      }
      return '';
    } catch {
      return '';
    }
  });


  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Password Checker States
  const [pwInput, setPwInput] = useState('');
  const [pwResult, setPwResult] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCheck, setShowPwCheck] = useState(false);

  // Sync & Device States
  const [deviceId, setDeviceId] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [phoneId, setPhoneId] = useState('');

  // File Scanner States
  const [fileResult, setFileResult] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [copiedHash, setCopiedHash] = useState('');

  // Security Tips Carousel
  const effectiveScore = cyberScore !== null
    ? cyberScore
    : (phoneHistory.length > 0 && typeof phoneHistory[0]?.score === 'number'
      ? phoneHistory[0].score
      : null);

  const [tipIdx, setTipIdx] = useState(0);
  const tips = [
    { icon: '🔑', title: 'Use Strong Passwords', desc: 'Mix uppercase, numbers, and symbols. Never reuse passwords across portals.' },
    { icon: '📱', title: 'Review App Permissions', desc: 'Regularly audit apps requesting background location, mic, SMS, or camera access.' },
    { icon: '🛡️', title: 'Scan Files Before Opening', desc: 'Compute client-side SHA-256 hashes to cross-reference against 74 threat intelligence engines.' },
    { icon: '🔒', title: 'Enable Two-Factor Authentication', desc: '2FA stops over 99.9% of automated credential stuffing and phishing attacks.' },
    { icon: '📶', title: 'Beware of Rogue Wi-Fi Networks', desc: 'Avoid unencrypted open hotspots or use VPN protection on public connections.' },
  ];

  const syncFromMobileAccount = async (targetEmail, hintDeviceId) => {
    if (!targetEmail || typeof fetch !== 'function') return;
    setIsAutoSyncing(true);
    try {
      let scans = [];
      let devId = hintDeviceId || syncedDevice || phoneId || '';
      if (!devId && typeof localStorage !== 'undefined') {
        devId = localStorage.getItem(`secureme_device_${targetEmail}`) || localStorage.getItem('synced_device') || '';
      }
      let scoreVal = null;
      let statusVal = 'Optimal';
      let recs = [];

      // 1. Try /sync-user/{email}
      try {
        const res = await apiFetch(`/sync-user/${encodeURIComponent(targetEmail)}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.scans) && data.scans.length > 0) {
            scans = data.scans;
          }
          if (data && data.device_id) devId = data.device_id;
          if (data && typeof data.cyber_score === 'number') scoreVal = data.cyber_score;
          if (data && data.cyber_status) statusVal = data.cyber_status;
          if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) recs = data.recommendations;
        }
      } catch (_) {}

      // 2. Try /get-scans/{targetEmail} directly
      try {
        const res = await apiFetch(`/get-scans/${encodeURIComponent(targetEmail)}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.scans) && data.scans.length > 0) {
            const existingIds = new Set(scans.map(s => s.id));
            for (const s of data.scans) {
              if (!existingIds.has(s.id)) {
                scans.push(s);
                existingIds.add(s.id);
              }
            }
          }
        }
      } catch (_) {}

      // 3. If devId is known, also fetch /get-scans/{devId} to merge all records
      if (devId) {
        try {
          const res = await apiFetch(`/get-scans/${encodeURIComponent(devId)}`);
          if (res && res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.scans) && data.scans.length > 0) {
              const existingIds = new Set(scans.map(s => s.id));
              for (const s of data.scans) {
                if (!existingIds.has(s.id)) {
                  scans.push(s);
                  existingIds.add(s.id);
                }
              }
            }
          }
        } catch (_) {}
      }

      // If scans retrieved, sort and compute mobile score & link device
      if (scans.length > 0) {
        scans.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setPhoneHistory(scans);

        if (!devId) {
          const found = scans.find(s => s.device_id && s.device_id !== 'unknown');
          if (found) devId = found.device_id;
        }

        const systemScan = scans.find(s => s.scan_type === 'Full System Scan');
        if (systemScan && typeof systemScan.score === 'number') {
          scoreVal = systemScan.score;
          statusVal = systemScan.status || (scoreVal >= 80 ? 'Optimal' : scoreVal >= 60 ? 'Moderate' : 'At Risk');
          try {
            const parsed = typeof systemScan.details === 'string' ? JSON.parse(systemScan.details) : systemScan.details;
            if (parsed && Array.isArray(parsed.recommendations)) recs = parsed.recommendations;
          } catch (_) {}
        } else if (scoreVal === null) {
          const validScores = scans.map(s => s.score).filter(s => typeof s === 'number');
          if (validScores.length > 0) {
            scoreVal = validScores[0];
            statusVal = scoreVal >= 80 ? 'Optimal' : scoreVal >= 60 ? 'Moderate' : 'At Risk';
          }
        }
      }

      if (devId) {
        setSyncedDevice(devId);
        setPhoneId(devId);
        setDeviceId(devId);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('synced_device', devId);
          localStorage.setItem('phoneId', devId);
          localStorage.setItem(`secureme_device_${targetEmail}`, devId);
        }
        // Permanently link device to email on backend
        try {
          apiFetch('/link-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail, device_id: devId })
          }).catch(() => {});
        } catch (_) {}
      }

      if (scoreVal !== null) setCyberScore(scoreVal);
      setCyberStatus(statusVal);
      if (recs.length > 0) setCyberRecommendations(recs);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
    } finally {
      setIsAutoSyncing(false);
    }
  };

  useEffect(() => {
    if (user && user.email) {
      syncFromMobileAccount(user.email, syncedDevice || phoneId);
      const interval = setInterval(() => {
        syncFromMobileAccount(user.email, syncedDevice || phoneId);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAuthMessages = () => {
    setAuthError('');
    setAuthSuccess('');
  };

  const login = async () => {
    setAuthLoading(true);
    clearAuthMessages();
    try {
      const res = await apiFetch('/login', {
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
        let resolvedDev = data.device_id || '';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('secureme_user', JSON.stringify(data));
          if (!resolvedDev) {
            resolvedDev = localStorage.getItem(`secureme_device_${data.email}`) || localStorage.getItem('synced_device') || '';
          }
          if (resolvedDev) {
            localStorage.setItem('synced_device', resolvedDev);
            localStorage.setItem('phoneId', resolvedDev);
            localStorage.setItem(`secureme_device_${data.email}`, resolvedDev);
            setSyncedDevice(resolvedDev);
            setPhoneId(resolvedDev);
            setDeviceId(resolvedDev);
          }
        }
        setUser(data);
        syncFromMobileAccount(data.email, resolvedDev);
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
      const res = await apiFetch('/register', {
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
      const res = await apiFetch('/verify-email', {
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
          if (data.user?.device_id) {
            localStorage.setItem('synced_device', data.user.device_id);
            localStorage.setItem('phoneId', data.user.device_id);
            setSyncedDevice(data.user.device_id);
            setPhoneId(data.user.device_id);
          }
        }
        setUser(data.user);
        syncFromMobileAccount(data.user.email, data.user?.device_id);
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
      const res = await apiFetch('/resend-verification', {
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
      const res = await apiFetch('/forgot-password', {
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
      const res = await apiFetch('/reset-password', {
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
      localStorage.removeItem('synced_device');
    }
    setUser(null);
    setPhoneHistory([]);
    setPhoneId('');
    setSyncedDevice('');
    setCyberScore(null);
    setCyberStatus('Syncing from mobile app...');
    setLastSyncTime(null);
    setTab('home');
    clearAuthMessages();
  };

  // Password Checker
  const checkPassword = async () => {
    if (!pwInput) return;
    setPwLoading(true);
    try {
      const res = await apiFetch('/check-password', {
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
      const res = await apiFetch(`/get-scans/${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      if (data && Array.isArray(data.scans) && data.scans.length > 0) {
        const sortedScans = [...data.scans].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setPhoneHistory(sortedScans);
        setPhoneId(deviceId);
        setSyncedDevice(deviceId);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('synced_device', deviceId);
          localStorage.setItem('phoneId', deviceId);
          if (user && user.email) {
            localStorage.setItem(`secureme_device_${user.email}`, deviceId);
          }
        }

        // Calculate score immediately
        const systemScan = sortedScans.find(s => s.scan_type === 'Full System Scan');
        let scoreVal = null;
        let statusVal = 'Optimal';
        let recs = [];
        if (systemScan && typeof systemScan.score === 'number') {
          scoreVal = systemScan.score;
          statusVal = systemScan.status || (scoreVal >= 80 ? 'Optimal' : scoreVal >= 60 ? 'Moderate' : 'At Risk');
          try {
            const parsed = typeof systemScan.details === 'string' ? JSON.parse(systemScan.details) : systemScan.details;
            if (parsed && Array.isArray(parsed.recommendations)) recs = parsed.recommendations;
          } catch (_) {}
        } else if (sortedScans.length > 0) {
          scoreVal = sortedScans[0].score;
          statusVal = scoreVal >= 80 ? 'Optimal' : scoreVal >= 60 ? 'Moderate' : 'At Risk';
        }

        if (scoreVal !== null) setCyberScore(scoreVal);
        setCyberStatus(statusVal);
        if (recs.length > 0) setCyberRecommendations(recs);
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Automatically link this device to the logged-in user on the backend
        if (user && user.email) {
          try {
            apiFetch('/link-device', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, device_id: deviceId })
            }).catch(() => {});
          } catch (_) {}
        }
      }
    } catch (e) {
    }
    setSyncLoading(false);
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
        const res = await apiFetch('/scan-file', {
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

  // scoreColor defined at top-level

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

      {/* Navigation Bar — 5 Clean Tabs */}
      <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', padding: '0 16px', overflowX: 'auto' }}>
        {[
          ['home', '🏠 Dashboard'],
          ['password', '🔑 Password'],
          ['files', '📁 File Scan'],
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
            
            {/* Live Mobile Sync Status Bar */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '16px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                  color: '#4B4FD9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20
                }}>
                  📱
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Mobile Sync Active</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: 12,
                      padding: '2px 8px'
                    }}>
                      ● Connected {cyberStatus ? `• ${cyberStatus}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Account: <strong style={{ color: '#334155' }}>{user.email}</strong>
                    {syncedDevice && <span> • Device: <code style={{ color: '#4B4FD9', fontWeight: 600 }}>{syncedDevice}</code></span>}
                    {lastSyncTime && <span> • Synced: {lastSyncTime}</span>}
                  </div>
                  {cyberRecommendations.length > 0 && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>🛡️</span> {cyberRecommendations[0]}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  textAlign: 'right',
                  marginRight: 4,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mobile Score</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(effectiveScore) }}>
                      {cyberStatus ? cyberStatus : (effectiveScore >= 75 ? 'Optimal' : effectiveScore >= 50 ? 'Moderate' : 'At Risk')}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor(effectiveScore), lineHeight: 1 }}>
                    {effectiveScore !== null ? effectiveScore : '--'}<span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>/100</span>
                  </div>
                </div>
                <button
                  onClick={() => syncFromMobileAccount(user.email, syncedDevice || phoneId)}
                  disabled={isAutoSyncing}
                  style={{
                    padding: '8px 14px',
                    background: isAutoSyncing ? '#EEF2FF' : '#4B4FD9',
                    color: isAutoSyncing ? '#4B4FD9' : '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: isAutoSyncing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isAutoSyncing ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {/* Live Mobile Cyber Health Score Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
              borderRadius: 20,
              padding: '24px 28px',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(75, 79, 217, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                {/* Left: Circular Score Gauge & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <ScoreGauge
                    score={effectiveScore !== null ? effectiveScore : 0}
                    size={110}
                    strokeWidth={9}
                    label="HEALTH"
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Mobile Cyber Health</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: effectiveScore >= 75 ? 'rgba(16, 185, 129, 0.2)' : effectiveScore >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.25)',
                        border: `1px solid ${scoreColor(effectiveScore)}`,
                        color: scoreColor(effectiveScore)
                      }}>
                        ● {cyberStatus || (effectiveScore >= 75 ? 'Optimal' : effectiveScore >= 50 ? 'Moderate' : 'At Risk')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#C7D2FE', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📱</span> Connected Device: <strong style={{ color: '#FFFFFF' }}>{syncedDevice || 'Android Client'}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#A5B4FC', marginTop: 4 }}>
                      {phoneHistory.length > 0
                        ? `Live score computed from ${phoneHistory.length} mobile security telemetry audits.`
                        : `Directly synced with ${user.email}. Run a scan in your SecureMe mobile app to refresh.`}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Telemetry Metrics */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: '#C7D2FE', fontWeight: 600, textTransform: 'uppercase' }}>Audits</div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{phoneHistory.length}</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: '#A7F3D0', fontWeight: 600, textTransform: 'uppercase' }}>Safe</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                      {phoneHistory.filter(s => (s.score || 0) >= 75).length}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: '#FECACA', fontWeight: 600, textTransform: 'uppercase' }}>Risks</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#F87171', marginTop: 2 }}>
                      {phoneHistory.filter(s => (s.score || 0) < 75).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations from Mobile Audit */}
              {cyberRecommendations && cyberRecommendations.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#E0E7FF' }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span><strong>Mobile Recommendation:</strong> {cyberRecommendations[0]}</span>
                </div>
              )}
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
                Security Overview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                
                <div
                  onClick={() => setTab('password')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1.5px solid #F59E0B', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Password/Check</div>
                  <div style={{ fontWeight: 700, color: '#D97706', fontSize: 15, marginTop: 2 }}>Check Now →</div>
                </div>

                <div
                  onClick={() => setTab('files')}
                  style={{ background: '#FFFFFF', borderRadius: 16, padding: 20, border: '1.5px solid #4B4FD9', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Files/Scan</div>
                  <div style={{ fontWeight: 700, color: '#4B4FD9', fontSize: 15, marginTop: 2 }}>Scan any file →</div>
                </div>

              </div>
            </div>

            {/* Direct Synced Mobile Scan History */}
            <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 22, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📱 Synced Mobile Scan History
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {syncedDevice ? `Connected Device: ${syncedDevice}` : `Directly synced from SecureMe Mobile App (${user.email})`}
                  </div>
                </div>
                <button
                  onClick={() => syncFromMobileAccount(user.email, syncedDevice || phoneId)}
                  disabled={isAutoSyncing}
                  style={{ padding: '6px 14px', background: '#EEF2FF', color: '#4B4FD9', border: '1px solid #C7D2FE', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                >
                  {isAutoSyncing ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              {phoneHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {phoneHistory.map((scan, i) => {
                    const color = scoreColor(scan.score);
                    const scanIcon = scan.scan_type?.includes('File') ? '📁' :
                                     scan.scan_type?.includes('Password') ? '🔑' :
                                     scan.scan_type?.includes('Permission') ? '🛡️' :
                                     scan.scan_type?.includes('Battery') ? '🔋' : '📱';
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
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ fontSize: 24, marginTop: 2 }}>{scanIcon}</div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {scan.scan_type}
                              {scan.status && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: `${color}15`, color }}>
                                  {scan.status}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                              {scan.created_at?.slice(0, 16).replace('T', ' ')}
                            </div>
                            <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>
                              {typeof scan.details === 'string' && scan.details.startsWith('{')
                                ? 'Audit details synchronized from mobile device'
                                : scan.details}
                            </div>
                          </div>
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
                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 24, border: '1px dashed #CBD5E1', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📲</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Mobile Account Connected</div>
                  <div style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '6px auto 14px' }}>
                    Your web app is directly connected with <strong>{user.email}</strong>. Run a security scan in the SecureMe Android app to see your scan history and health score appear here automatically.
                  </div>
                  <button
                    onClick={() => syncFromMobileAccount(user.email, syncedDevice || phoneId)}
                    disabled={isAutoSyncing}
                    style={{ padding: '8px 18px', background: '#4B4FD9', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                  >
                    {isAutoSyncing ? 'Checking...' : '🔄 Check for Scans'}
                  </button>
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

        {/* ── TAB: SYNC RESULTS ── */}
        {tab === 'sync' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '28px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 26 }}>🔄</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Mobile Device Sync</div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>Direct cloud sync active with your SecureMe mobile account</div>
                  </div>
                </div>
                <button
                  onClick={() => syncFromMobileAccount(user.email, syncedDevice || phoneId)}
                  disabled={isAutoSyncing}
                  style={{
                    padding: '10px 18px',
                    background: isAutoSyncing ? '#EEF2FF' : '#4B4FD9',
                    color: isAutoSyncing ? '#4B4FD9' : '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: isAutoSyncing ? 'wait' : 'pointer'
                  }}
                >
                  {isAutoSyncing ? 'Refreshing...' : '🔄 Fetch Updates'}
                </button>
              </div>

              {/* Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginTop: 20 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>SYNCED ACCOUNT</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 4, wordBreak: 'break-all' }}>{user.email}</div>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4 }}>● Directly Synced</div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>CONNECTED DEVICE</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#4B4FD9', marginTop: 4 }}>
                    {syncedDevice || 'SecureMe Android Client'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    {lastSyncTime ? `Last update: ${lastSyncTime}` : 'Live auto-sync'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>TOTAL SCANS SYNCED</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                    {phoneHistory.length}
                  </div>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                    {phoneHistory.filter(s => s.score >= 75).length} Safe • {phoneHistory.filter(s => s.score < 75).length} Risks
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>MOBILE HEALTH SCORE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(effectiveScore), marginTop: 2 }}>
                    {effectiveScore !== null ? `${effectiveScore}/100` : '--'}
                  </div>
                  <div style={{ fontSize: 11, color: scoreColor(effectiveScore), fontWeight: 700 }}>
                    ● {cyberStatus || (effectiveScore >= 75 ? 'Optimal' : effectiveScore >= 50 ? 'Moderate' : 'At Risk')}
                  </div>
                </div>
              </div>

              {/* Synced Scans List */}
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                  Synchronized Telemetry ({phoneHistory.length} audits)
                </div>

                {phoneHistory.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {phoneHistory.map((scan, i) => (
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
                          <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>
                            {typeof scan.details === 'string' && scan.details.startsWith('{')
                              ? `Status: ${scan.status || 'Completed'}`
                              : scan.details}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '8px 16px', borderRadius: 12 }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(scan.score) }}>{scan.score}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>/100</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                    No audit records saved yet for this account. Run a scan on your phone to view results here.
                  </div>
                )}
              </div>

              {/* Manual Device Override Accordion */}
              <div style={{ marginTop: 24, borderTop: '1px solid #E2E8F0', paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Manual Device ID Override (Optional)
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={deviceId}
                    onChange={e => setDeviceId(e.target.value)}
                    placeholder="Find in SecureMe app → Profile → Device ID"
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13 }}
                  />
                  <button
                    onClick={fetchSync}
                    disabled={syncLoading || !deviceId}
                    style={{
                      padding: '10px 18px',
                      background: deviceId ? '#4B4FD9' : '#CBD5E1',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: deviceId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {syncLoading ? 'Fetching...' : 'Query Device'}
                  </button>
                </div>
              </div>

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
                ['🔋', 'Battery & Performance', 'Monitors RAM usage, temperature, and running processes']
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
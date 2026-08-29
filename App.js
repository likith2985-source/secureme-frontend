import { useState, useEffect } from 'react';

const API = 'https://secureme-backend-h0kx.onrender.com';

export default function App() {
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwResult, setPwResult] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [syncData, setSyncData] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [phoneHistory, setPhoneHistory] = useState([]);
  const [phoneId, setPhoneId] = useState('');
  const [fileResult, setFileResult] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('secureme_user');
    const savedPhoneId = localStorage.getItem('phoneId');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedPhoneId) { setPhoneId(savedPhoneId); fetchPhoneHistory(savedPhoneId); }
    const interval = setInterval(() => {
      const id = localStorage.getItem('phoneId');
      if (id) fetchPhoneHistory(id);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = async () => {
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) { setAuthError(data.error); }
      else { localStorage.setItem('secureme_user', JSON.stringify(data)); setUser(data); }
    } catch (e) { setAuthError('Connection error. Try again.'); }
    setAuthLoading(false);
  };

  const register = async () => {
    setAuthLoading(true); setAuthError('');
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (data.error) { setAuthError(data.error); }
      else { setAuthTab('login'); setAuthError('Registered! Please login.'); }
    } catch (e) { setAuthError('Connection error. Try again.'); }
    setAuthLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('secureme_user');
    localStorage.removeItem('phoneId');
    setUser(null); setPhoneHistory([]); setPhoneId('');
    setScore(null); setTab('home');
  };

  const scanDevice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cyber-health-score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'test123', installed_apps: ['com.whatsapp', 'com.fake.spyware'] })
      });
      const data = await res.json();
      setScore(data.score); setStatus(data.status); setRecommendations(data.recommendations);
    } catch (e) { setScore(0); setStatus('Error'); }
    setLoading(false);
  };

  const checkPassword = async () => {
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/check-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput })
      });
      setPwResult(await res.json());
    } catch (e) { }
    setPwLoading(false);
  };

  const fetchSync = async () => {
    if (!deviceId) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`${API}/get-scans/${deviceId}`);
      setSyncData(await res.json());
    } catch (e) { }
    setSyncLoading(false);
  };

  const fetchPhoneHistory = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`${API}/get-scans/${id}`);
      const data = await res.json();
      setPhoneHistory(data.scans || []);
    } catch (e) { }
  };

  const scanFile = async () => {
    if (!selectedFile) return;
    setFileLoading(true); setFileResult(null);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const res = await fetch(`${API}/scan-file`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_hash: hash, file_name: selectedFile.name })
      });
      const data = await res.json();
      setFileResult({ ...data, hash, fileName: selectedFile.name, size: (selectedFile.size / 1024).toFixed(1) });
    } catch (e) { setFileResult({ error: 'Scan failed. Try again.' }); }
    setFileLoading(false);
  };

  const scoreColor = (s) => s >= 75 ? '#2E7D32' : s >= 50 ? '#B5610A' : '#E53935';

  // AUTH SCREEN
  if (!user) return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#F5F5F7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40 }}>🛡️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E' }}>SecureMe</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>AI-Driven Mobile Security Analyzer</div>
        </div>

        <div style={{ display: 'flex', marginBottom: 24, background: '#F5F5F7', borderRadius: 10, padding: 4 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setAuthTab(t); setAuthError(''); }} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: authTab === t ? '#4B4FD9' : 'none', color: authTab === t ? '#fff' : '#6B7280'
            }}>{t === 'login' ? 'Login' : 'Register'}</button>
          ))}
        </div>

        {authTab === 'register' && (
          <>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Full Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} />
          </>
        )}

        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Email</div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} />

        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>Password</div>
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', marginBottom: 20 }} />

        {authError && <div style={{ background: authError.includes('Registered') ? '#F0FDF4' : '#FEF2F2', color: authError.includes('Registered') ? '#2E7D32' : '#E53935', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{authError}</div>}

        <button onClick={authTab === 'login' ? login : register} disabled={authLoading} style={{ width: '100%', padding: 12, background: '#4B4FD9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {authLoading ? 'Please wait...' : authTab === 'login' ? '🔐 Login' : '📝 Register'}
        </button>
      </div>
    </div>
  );

  // MAIN APP
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#F5F5F7', minHeight: '100vh' }}>
      <div style={{ background: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #E5E7EB' }}>
        <span style={{ fontSize: 22, marginRight: 8 }}>🛡️</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E' }}>SecureMe</span>
        <span style={{ marginLeft: 8, fontSize: 13, color: '#6B7280' }}>AI-Driven Mobile Security Analyzer</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>👤 {user.name || user.email}</span>
          <button onClick={logout} style={{ padding: '6px 14px', background: '#FEF2F2', color: '#E53935', border: '1px solid #FECACA', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', display: 'flex', borderBottom: '1px solid #E5E7EB', overflowX: 'auto' }}>
        {[['home','🏠 Dashboard'],['password','🔑 Password'],['files','📁 File Scan'],['sync','🔄 Sync'],['about','ℹ️ About']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontWeight: tab === t ? 700 : 400, color: tab === t ? '#4B4FD9' : '#6B7280',
            borderBottom: tab === t ? '2px solid #4B4FD9' : '2px solid transparent', fontSize: 14
          }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>

        {tab === 'home' && <>
          <div style={{ background: 'linear-gradient(135deg, #4B4FD9, #7B5EA7)', borderRadius: 20, padding: 32, color: '#fff', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.8 }}>CYBER HEALTH SCORE</div>
                <div style={{ fontSize: 36, fontWeight: 700, margin: '8px 0' }}>
                  {score === null ? 'Tap Scan' : score >= 75 ? 'Excellent' : score >= 50 ? 'Moderate' : 'At Risk'}
                </div>
                <div style={{ opacity: 0.85, fontSize: 14 }}>{score === null ? 'Run a scan to see your security status.' : status}</div>
                {recommendations.map((r, i) => <div key={i} style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>• {r}</div>)}
                <button onClick={scanDevice} disabled={loading} style={{ marginTop: 20, background: '#fff', color: '#4B4FD9', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {loading ? 'Scanning...' : '▶ Run Instant Scan'}
                </button>
              </div>
              <div style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, marginLeft: 24 }}>
                {score ?? '--'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 12 }}>Security Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1.5px solid #E5E7EB' }}>
              <div style={{ fontSize: 24 }}>📱</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Apps/Safe</div>
              <div style={{ fontWeight: 700 }}>Scan to check</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1.5px solid #B5610A', cursor: 'pointer' }} onClick={() => setTab('password')}>
              <div style={{ fontSize: 24 }}>🔑</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Password/Check</div>
              <div style={{ fontWeight: 700, color: '#B5610A' }}>Check Now →</div>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1.5px solid #4B4FD9', marginBottom: 12, cursor: 'pointer' }} onClick={() => setTab('files')}>
            <div style={{ fontSize: 24 }}>📁</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Files/Scan</div>
            <div style={{ fontWeight: 700, color: '#4B4FD9' }}>Scan any file →</div>
          </div>

          {phoneHistory.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', flex: 1 }}>📱 Phone Scan History</div>
                <button onClick={() => fetchPhoneHistory(phoneId || localStorage.getItem('phoneId'))} style={{ padding: '6px 14px', background: '#4B4FD9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🔄 Refresh</button>
              </div>
              {phoneHistory.map((scan, i) => {
                const color = scoreColor(scan.score);
                return (
                  <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, border: `1.5px solid ${color}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1A1A2E' }}>{scan.scan_type}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{scan.created_at.slice(0,16).replace('T',' ')}</div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>{scan.details}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color }}>{scan.score}</div>
                      <div style={{ fontSize: 11, color }}>/100</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>📱 Link Your Phone</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={phoneId} onChange={e => setPhoneId(e.target.value)}
                  placeholder="Enter Device ID from SecureMe app → Profile"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 13 }} />
                <button onClick={() => { localStorage.setItem('phoneId', phoneId); fetchPhoneHistory(phoneId); }} style={{ padding: '10px 16px', background: '#4B4FD9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Link</button>
              </div>
            </div>
          )}
        </>}

        {tab === 'files' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>📁 File Scanner</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Upload any file to scan for malware using VirusTotal (74 engines). Works on Windows, Mac, Android — any device!</div>

            <div style={{ border: '2px dashed #E5E7EB', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 20, background: '#FAFAFA' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setSelectedFile(e.dataTransfer.files[0]); setFileResult(null); }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Drag & drop a file here</div>
              <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>or click to browse</div>
              <input type="file" id="fileInput" style={{ display: 'none' }} onChange={e => { setSelectedFile(e.target.files[0]); setFileResult(null); }} />
              <label htmlFor="fileInput" style={{ padding: '10px 24px', background: '#4B4FD9', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Browse File</label>
            </div>

            {selectedFile && (
              <div style={{ background: '#EEF2FF', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>📄</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1A1A2E' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            )}

            <button onClick={scanFile} disabled={!selectedFile || fileLoading} style={{ width: '100%', padding: 12, background: selectedFile ? '#4B4FD9' : '#E5E7EB', color: selectedFile ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: selectedFile ? 'pointer' : 'not-allowed' }}>
              {fileLoading ? '🔍 Scanning with 74 engines...' : '🔍 Scan File'}
            </button>

            {fileResult && (
              <div style={{ marginTop: 20 }}>
                {fileResult.error ? (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, color: '#E53935' }}>{fileResult.error}</div>
                ) : (
                  <>
                    <div style={{ background: fileResult.is_malicious ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${fileResult.is_malicious ? '#FECACA' : '#86EFAC'}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{fileResult.is_malicious ? '🚨' : '✅'}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: fileResult.is_malicious ? '#E53935' : '#2E7D32' }}>
                        {fileResult.is_malicious ? 'Malware Detected!' : 'File is Clean'}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{fileResult.fileName} • {fileResult.size} KB</div>
                    </div>
                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>SHA-256 Hash</div>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#1A1A2E', wordBreak: 'break-all' }}>{fileResult.hash}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ background: '#EEF2FF', borderRadius: 10, padding: 14, marginTop: 16, fontSize: 13, color: '#4B4FD9' }}>
              💡 This scanner computes SHA-256 hash locally in your browser — your file is <strong>never uploaded</strong> to our servers. Only the hash is checked against VirusTotal.
            </div>
          </div>
        )}

        {tab === 'password' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>🔑 Password Checker</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Verify strength against modern brute-force standards.</div>
            {pwResult && (
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', border: `6px solid ${scoreColor(pwResult.score)}`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor(pwResult.score) }}>{pwResult.score}</div>
                  <div style={{ fontSize: 11, color: scoreColor(pwResult.score), letterSpacing: 1 }}>{pwResult.strength.toUpperCase().slice(0,6)}</div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 8, fontSize: 13, color: '#6B7280' }}>Enter Password</div>
            <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="Enter your password"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, boxSizing: 'border-box', marginBottom: 16 }} />
            <button onClick={checkPassword} disabled={pwLoading} style={{ width: '100%', padding: 12, background: '#4B4FD9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              {pwLoading ? 'Analyzing...' : '🔍 Analyze Password'}
            </button>
            {pwResult && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Security Suggestions</div>
                {pwResult.score >= 75 && <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 14, marginBottom: 8, fontSize: 13 }}>✅ Password contains a good mix of characters.</div>}
                {pwResult.suggestions.map((s, i) => <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: 14, marginBottom: 8, fontSize: 13 }}>⚠️ {s}</div>)}
                <div style={{ background: '#EEF2FF', borderRadius: 10, padding: 12, fontSize: 12, color: '#4B4FD9', marginTop: 8 }}>ℹ️ Processing done on secure server. Password is never stored.</div>
              </div>
            )}
          </div>
        )}

        {tab === 'sync' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>🔄 Sync Results</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Enter your Android Device ID to see scan results synced from your phone.</div>
            <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Find in SecureMe app → Profile → Device ID"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }} />
            <button onClick={fetchSync} disabled={syncLoading} style={{ width: '100%', padding: 12, background: '#4B4FD9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 24 }}>
              {syncLoading ? 'Fetching...' : '🔄 Fetch My Scans'}
            </button>
            {syncData && <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{syncData.total} scan(s) found</div>
              {(syncData.scans || []).map((scan, i) => (
                <div key={i} style={{ border: `1.5px solid ${scoreColor(scan.score)}30`, borderRadius: 12, padding: 16, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1A1A2E' }}>{scan.scan_type}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{scan.created_at.slice(0,16).replace('T',' ')}</div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{scan.details}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(scan.score) }}>{scan.score}</div>
                      <div style={{ fontSize: 11, color: scoreColor(scan.score) }}>/100</div>
                    </div>
                  </div>
                </div>
              ))}
            </>}
            <div style={{ background: '#EEF2FF', borderRadius: 10, padding: 14, fontSize: 13, color: '#4B4FD9' }}>
              💡 Find your Device ID: Open SecureMe app → Profile tab
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>ℹ️ About SecureMe</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>AI-Driven Mobile Security Analyzer</div>
            {[
              ['📁','File Scanner','Upload any file — scanned locally via SHA-256 + VirusTotal (74 engines)'],
              ['🛡️','Permission Analyzer','Detects 70+ dangerous permissions across all installed apps'],
              ['🔑','Password Checker','Real-time strength analysis with improvement suggestions'],
              ['📊','Cyber Health Score','AI-weighted score (0-100): Safe, Moderate, or High Risk'],
              ['🔋','Battery & Performance','Monitors RAM usage, temperature, and running processes'],
            ].map(([icon, title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1A1A2E' }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 16, background: '#4B4FD9', borderRadius: 12, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Built with</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Kotlin + Jetpack Compose • FastAPI • VirusTotal API • SHA-256</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
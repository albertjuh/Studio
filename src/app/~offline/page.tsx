"use client";
export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#0a0a0a',
      color: 'white', fontFamily: 'sans-serif', textAlign: 'center', gap: '16px'
    }}>
      <img src="/logo.png" alt="PartoMa" style={{ width: 80, borderRadius: 16 }} />
      <h2 style={{ margin: 0 }}>You're offline</h2>
      <p style={{ color: '#888', margin: 0 }}>
        Data entered will sync when you reconnect.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 8,
          background: '#22c55e', color: 'white', border: 'none',
          fontSize: 14, cursor: 'pointer'
        }}>
        Try Again
      </button>
    </div>
  );
}

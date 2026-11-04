// Multiplayer networking module for Dojo Fight 3D
// Supports real-time peer-to-peer over WebRTC (PeerJS) for cross-device/online,
// and native BroadcastChannel for zero-latency local multi-tab/window testing.

let activeSession = null;

export function getActiveSession() {
  return activeSession;
}

export function closeActiveSession() {
  if (activeSession) {
    activeSession.close();
    activeSession = null;
  }
}

export function createMultiplayerSession({ roomCode, isHost, onMessage, onStatusChange }) {
  if (activeSession) {
    activeSession.close();
  }

  const cleanCode = roomCode.trim().toUpperCase();
  let channel = null;
  let peer = null;
  let connection = null;
  let status = 'connecting'; // 'connecting' | 'connected' | 'disconnected'
  const role = isHost ? 'p1' : 'p2';

  const updateStatus = (newStatus, details = {}) => {
    status = newStatus;
    if (activeSession) activeSession.status = newStatus;
    onStatusChange?.(status, { role, ...details });
    if (activeSession && typeof activeSession.onStatusChange === 'function') {
      activeSession.onStatusChange(status, { role, ...details });
    }
  };

  // 1. BroadcastChannel (instant zero-latency connection between tabs/windows on same computer)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('dojo3d-room-' + cleanCode);
      channel.onmessage = (event) => {
        handleIncoming(event.data, 'broadcast');
      };
    }
  } catch (err) {
    console.warn('BroadcastChannel not supported:', err);
  }

  // 2. PeerJS (WebRTC over internet across different devices)
  try {
    if (typeof window !== 'undefined' && window.Peer) {
      const myPeerId = isHost
        ? `dojo3d-${cleanCode}-host`
        : `dojo3d-${cleanCode}-guest-${Math.floor(Math.random() * 10000)}`;

      peer = new window.Peer(myPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      peer.on('open', () => {
        if (!isHost) {
          // Guest connects to Host
          const hostId = `dojo3d-${cleanCode}-host`;
          const conn = peer.connect(hostId, { reliable: true });
          setupConnection(conn);
        }
      });

      peer.on('connection', (conn) => {
        setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.warn('PeerJS error:', err?.type || err);
      });
    }
  } catch (err) {
    console.warn('PeerJS init failed:', err);
  }

  function setupConnection(conn) {
    connection = conn;
    conn.on('open', () => {
      updateStatus('connected', { via: 'webrtc' });
      send({ type: 'HANDSHAKE', role, roomCode: cleanCode });
    });

    conn.on('data', (data) => {
      handleIncoming(data, 'webrtc');
    });

    conn.on('close', () => {
      updateStatus('disconnected');
    });
  }

  function handleIncoming(msg, source) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'HANDSHAKE') {
      updateStatus('connected', { via: source });
      if (isHost && msg.role !== 'p1') {
        send({ type: 'HANDSHAKE_ACK', role: 'p1' });
      }
      if (activeSession && typeof activeSession.onMessage === 'function') {
        activeSession.onMessage(msg);
      } else if (typeof onMessage === 'function') {
        onMessage(msg);
      }
      return;
    }

    if (msg.type === 'HANDSHAKE_ACK') {
      updateStatus('connected', { via: source });
      if (activeSession && typeof activeSession.onMessage === 'function') {
        activeSession.onMessage(msg);
      } else if (typeof onMessage === 'function') {
        onMessage(msg);
      }
      return;
    }

    if (activeSession && typeof activeSession.onMessage === 'function') {
      activeSession.onMessage(msg);
    } else if (typeof onMessage === 'function') {
      onMessage(msg);
    }
  }

  function send(msg) {
    if (!msg) return;
    try {
      channel?.postMessage(msg);
    } catch {}
    try {
      if (connection && connection.open) {
        connection.send(msg);
      }
    } catch {}
  }

  // Periodic handshake broadcast until connected
  const heartbeat = setInterval(() => {
    if (status !== 'connected') {
      send({ type: 'HANDSHAKE', role, roomCode: cleanCode });
    }
  }, 600);

  activeSession = {
    roomCode: cleanCode,
    isHost,
    role,
    status,
    getStatus: () => status,
    send,
    onMessage: onMessage || null,
    setMessageHandler: (fn) => {
      if (activeSession) activeSession.onMessage = fn;
    },
    close: () => {
      clearInterval(heartbeat);
      try { channel?.close(); } catch {}
      try { connection?.close(); } catch {}
      try { peer?.destroy(); } catch {}
      activeSession = null;
    },
  };

  return activeSession;
}

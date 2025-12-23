export function createWS({ url, onMessage, onOpen, onClose, onError }) {
  let ws = null;
  let pingTimer = null;
  let lastPongAt = 0;

  const PING_EVERY_MS = 15000;
  const PONG_TIMEOUT_MS = 45000;

  function stopPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  function startPing() {
    stopPing();
    lastPongAt = Date.now();

    pingTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      // Send ping
      ws.send(JSON.stringify({ type: "ping" }));
      console.log("WS: ping sent");
      console.log(new Date().toLocaleString());

      // If no pong for too long, force close (caller can reconnect)
      if (Date.now() - lastPongAt > PONG_TIMEOUT_MS) {
        try { ws.close(); } catch {}
      }
    }, PING_EVERY_MS);
  }

  function connect() {
    // Guard: do not open multiple connections
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      startPing();
      onOpen && onOpen();
    });

    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(JSON.parse(ev.data));
        // console.log("WS: message received", msg);
      } catch {
        console.warn("WS: non-JSON message", ev.data);
        return;
      }

      // Handle keepalive internally
      if (msg.type === "pong") {
        lastPongAt = Date.now();
        return;
      }

      onMessage && onMessage(msg);
    });

    ws.addEventListener("close", () => {
      stopPing();
      ws = null;
      onClose && onClose();
    });

    ws.addEventListener("error", (err) => {
      onError && onError(err);
    });
  }

  function send(obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(obj));
    return true;
  }

  function close() {
    stopPing();
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
  }

  return { connect, send, close };
}
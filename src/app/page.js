"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { createWS } from "../lib/ws";

export default function Home() {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("home"); // home | waiting | playing
  const [log, setLog] = useState([]);

  const [wsUrl, setWsUrl] = useState(null);

  useEffect(() => {
    const wsPort = 8082;

    const url =
      (window.location.protocol === "https:" ? "wss://" : "ws://") +
      window.location.hostname +
      ":" + wsPort + "/ws";

    setWsUrl(url);
  }, []);

  // const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  const ws = useMemo(() => {
    return createWS({
      url: wsUrl,
      onOpen: () => pushLog("WS connected"),
      onClose: () => pushLog("WS closed"),
      onMessage: (msg) => {
        pushLog("IN: " + JSON.stringify(msg));
        if (msg.type === "state") setPhase("playing");
        if (msg.type === "wait") setPhase("waiting");
      },
      onError: () => pushLog("WS error"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  function pushLog(line) {
    setLog((prev) => [line, ...prev].slice(0, 20));
  }

  useEffect(() => {
    // Connect only when user joins (recommended for your 5s timeout requirement).
    // So do nothing here.
    return () => ws.close();
  }, [ws]);

  function onJoin() {
    if (!name.trim()) return;

    ws.connect();

    // Send bonjour shortly after connect. Some servers need a tick.
    setTimeout(() => {
      const ok = ws.send({ type: "bonjour", name: name.trim() });
      pushLog("OUT bonjour: " + (ok ? "ok" : "failed"));
      setPhase("waiting");
    }, 50);
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.h1}>Planet-C</h1>
        <p className={styles.p}>Join the game</p>

        {phase === "home" && (
          <div className={styles.row}>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="off"
            />
            <button className={styles.button} onClick={onJoin}>
              Join
            </button>
          </div>
        )}

        {phase === "waiting" && (
          <div className={styles.waiting}>
            <div className={styles.spinner} />
            <div>
              <div className={styles.big}>Waiting...</div>
              <div className={styles.small}>Connected as {name}</div>
            </div>
          </div>
        )}

        {phase === "playing" && (
          <div className={styles.playing}>
            Game state received. Render your UI here.
          </div>
        )}

        <div className={styles.log}>
          {log.map((l, i) => (
            <div key={i} className={styles.logLine}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
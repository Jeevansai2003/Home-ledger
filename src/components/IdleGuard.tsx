"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_LIMIT_MS, PING_EVERY_MS, WARNING_MS } from "@/lib/idle";

const STORAGE_KEY = "hl:last-activity"; // shared by all open tabs
const EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;

export default function IdleGuard() {
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const warningOpen = useRef(false);
  const ending = useRef(false);
  const stayRef = useRef<HTMLButtonElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const signOut = useCallback(async (timedOut: boolean) => {
    if (ending.current) return;
    ending.current = true;
    try {
      await fetch("/api/session/end", { method: "POST" });
    } catch {
      /* offline: still leave the page */
    }
    window.location.assign(timedOut ? "/login?reason=timeout" : "/login");
  }, []);

  const ping = useCallback(async () => {
    try {
      const res = await fetch("/api/session/ping", { method: "POST" });
      if (!res.ok || res.redirected) void signOut(true); // server already ended the session
    } catch {
      /* network blip: try again on the next activity */
    }
  }, [signOut]);

  const record = useCallback(
    (now: number) => {
      lastActivity.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        /* storage blocked: this tab still works on its own */
      }
      if (now - lastPing.current > PING_EVERY_MS) {
        lastPing.current = now;
        void ping();
      }
    },
    [ping],
  );

  const stay = useCallback(() => {
    warningOpen.current = false;
    setSecondsLeft(null);
    lastPing.current = Date.now();
    record(Date.now());
    void ping();
  }, [ping, record]);

  useEffect(() => {
    record(Date.now());

    const onActivity = () => {
      if (warningOpen.current) return; // once warned, only the button counts
      const now = Date.now();
      if (now - lastActivity.current < 1000) return; // throttle
      record(now);
    };
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      let latest = lastActivity.current;
      try {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        if (stored > latest) latest = stored; // another tab was active
      } catch {
        /* ignore */
      }
      const idle = Date.now() - latest;

      if (idle >= IDLE_LIMIT_MS) {
        void signOut(true);
      } else if (idle >= IDLE_LIMIT_MS - WARNING_MS) {
        warningOpen.current = true;
        setSecondsLeft(Math.ceil((IDLE_LIMIT_MS - idle) / 1000));
      } else if (warningOpen.current) {
        warningOpen.current = false; // activity in another tab
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, [record, signOut]);

  const open = secondsLeft !== null;
  useEffect(() => {
    if (open) stayRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
        onKeyDown={(e) => {
          if (e.key === "Escape") stay();
        }}
        className="card w-full max-w-sm p-6 shadow-xl"
      >
        <h2 id="idle-title" className="font-display text-xl font-semibold">Are you still there?</h2>
        <p id="idle-desc" className="mt-2 text-sm text-muted">
          For your security you will be signed out in{" "}
          <span className="num font-semibold text-ink">{secondsLeft}</span> seconds because there has been no activity.
        </p>
        <div className="mt-5 flex gap-3">
          <button ref={stayRef} type="button" className="btn btn-primary flex-1" onClick={stay}>
            Stay signed in
          </button>
          <button type="button" className="btn btn-secondary flex-1" onClick={() => void signOut(false)}>
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";

const consentKey = "edumanage-cookie-consent";

export function CookieConsent() {
  const visible = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => window.localStorage.getItem(consentKey) === null,
    () => false,
  );

  function choose(value: "accepted" | "rejected") {
    window.localStorage.setItem(consentKey, value);
    window.dispatchEvent(new Event("storage"));
  }

  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="text-sm text-slate-700">We use a local preference to remember your cookie choice. No analytics script is loaded by default.</p>
      <div className="mt-3 flex gap-2">
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => choose("accepted")}>Accept</button>
        <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => choose("rejected")}>Reject</button>
      </div>
    </div>
  );
}

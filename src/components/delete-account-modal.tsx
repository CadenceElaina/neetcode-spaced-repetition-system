"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";

export function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmation.trim().toLowerCase() === "delete my account";

  function reset() {
    setConfirmation("");
    setError(null);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function handleDelete() {
    if (!matches || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
        setLoading(false);
        return;
      }

      localStorage.removeItem("aurora_onboarding_complete");
      localStorage.removeItem("srs_target");
      localStorage.removeItem("aurora_greeting");
      localStorage.removeItem("aurora_guide_pos");

      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!open) return null;
  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Delete account"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-destructive/30 bg-muted shadow-2xl">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Delete your account
          </h2>
        </div>

        <div className="px-5 pb-4 space-y-3">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground space-y-2">
            <p className="font-medium">This action is permanent and cannot be undone.</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The following will be permanently deleted:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Your account and profile</li>
              <li>All logged attempts and solve history</li>
              <li>SRS progress (stability, review schedules)</li>
              <li>Notes on problems</li>
              <li>GitHub sync configuration</li>
            </ul>
          </div>

          <div>
            <label htmlFor="delete-confirm" className="block text-xs text-muted-foreground mb-1.5">
              Type <span className="font-semibold text-foreground">delete my account</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-destructive/50"
              placeholder="delete my account"
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={handleClose}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-background transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || loading}
            className="rounded-md px-4 py-2 text-sm font-medium bg-destructive text-white transition-colors hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-1.5 text-sm text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors duration-150"
      >
        Delete account
      </button>
      <DeleteAccountModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

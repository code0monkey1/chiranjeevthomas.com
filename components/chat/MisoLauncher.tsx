"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMiso } from "./ChatMiso";
import { RagdollCat } from "./RagdollCat";

const HASH = "#ask-miso";
const PREVIEW_KEY = "miso-intro-seen";

/**
 * A one-line "Ask Miso" bar that opens the full chat in a modal dialog, so the chat never pushes Projects down.
 * The chat stays mounted while closed, so reopening keeps the conversation. Links to #ask-miso open it too.
 */
export function MisoLauncher() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    setPreview(false);
    d.inert = false;
    d.showModal();
    setOpen(true);
    document.documentElement.classList.add("dialog-open");
    // Start in the composer, as if the visitor had clicked into it.
    requestAnimationFrame(() => document.getElementById("ask-box")?.focus());
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    // Runs for every way of closing: Escape, the close button and a click on the backdrop.
    const onClose = () => {
      setOpen(false);
      document.documentElement.classList.remove("dialog-open");
      if (location.hash === HASH) history.replaceState(null, "", location.pathname + location.search);
      launcher.current?.focus();
    };
    const onHash = () => { if (location.hash === HASH) show(); };
    d.addEventListener("close", onClose);
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      d.removeEventListener("close", onClose);
      window.removeEventListener("hashchange", onHash);
    };
  }, [show]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => {
      const button = launcher.current;
      const panel = dialog.current;
      if (!button || !panel || panel.open || location.hash || motion.matches) return;
      try {
        if (localStorage.getItem(PREVIEW_KEY)) return;
        localStorage.setItem(PREVIEW_KEY, "1");
      } catch {
        // Skip the intro if the browser cannot remember that it was shown.
        return;
      }

      const bounds = button.getBoundingClientRect();
      const x = bounds.left + bounds.width / 2;
      const y = Math.min(innerHeight - 40, Math.max(40, bounds.top + bounds.height / 2));
      panel.style.setProperty("--miso-preview-x", `${x - innerWidth / 2}px`);
      panel.style.setProperty("--miso-preview-y", `${y - innerHeight / 2}px`);
      setPreview(true);
    });
    const respectMotionChange = () => { if (motion.matches) setPreview(false); };
    motion.addEventListener("change", respectMotionChange);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", respectMotionChange);
    };
  }, []);

  return (
    <div id="ask-miso" className="miso-launch">
      <button ref={launcher} type="button" className="miso-launcher" aria-haspopup="dialog" aria-expanded={open} aria-controls="miso-dialog" onClick={show}>
        <span className="miso-launcher-orb" aria-hidden="true" />
        <span className="miso-launcher-cat" aria-hidden="true"><RagdollCat still size={40} /></span>
        <span className="miso-launcher-text">
          <strong>Ask Miso</strong>
          <span>Questions about my projects, with links to sources</span>
        </span>
        <span className="miso-launcher-go" aria-hidden="true">↗</span>
      </button>
      {/* A click that lands on the dialog itself (not the chat inside it) is a click on the backdrop. */}
      <dialog
        ref={dialog}
        id="miso-dialog"
        className="miso-dialog"
        aria-label="Ask Miso"
        aria-hidden={preview || undefined}
        data-preview={preview || undefined}
        inert={preview}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget && e.animationName === "miso-dialog-preview") setPreview(false); }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <ChatMiso onClose={close} />
      </dialog>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMiso } from "./ChatMiso";
import { RagdollCat } from "./RagdollCat";

const HASH = "#ask-miso";

/**
 * A one-line "Ask Miso" bar that opens the full chat in a modal dialog, so the chat never pushes Projects down.
 * The chat stays mounted while closed, so reopening keeps the conversation. Links to #ask-miso open it too.
 */
export function MisoLauncher() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
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

  return (
    <div id="ask-miso" className="miso-launch">
      <button ref={launcher} type="button" className="miso-launcher" aria-haspopup="dialog" aria-expanded={open} aria-controls="miso-dialog" onClick={show}>
        <span className="miso-launcher-cat" aria-hidden="true"><RagdollCat still size={40} /></span>
        <span className="miso-launcher-text">
          <strong>Ask Miso</strong>
          <span>Questions about my projects, with links to sources</span>
        </span>
        <span className="miso-launcher-go" aria-hidden="true">↗</span>
      </button>
      {/* A click that lands on the dialog itself (not the chat inside it) is a click on the backdrop. */}
      <dialog ref={dialog} id="miso-dialog" className="miso-dialog" aria-label="Ask Miso" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <ChatMiso onClose={close} />
      </dialog>
    </div>
  );
}

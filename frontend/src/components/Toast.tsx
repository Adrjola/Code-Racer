import { useEffect, useRef, useState } from 'react';

const VISIBLE_MS = 4000;
const FADE_MS = 400;

type ToastProps = {
  message: string;
  /** Called once the toast has finished fading, so the owner can clear it. */
  onDismiss: () => void;
};

/**
 * A short message that announces itself and then gets out of the way. Used for
 * things worth saying once - "that was the only snippet" - where a dialog the
 * player has to dismiss would be heavier than the news is worth.
 */
export default function Toast({ message, onDismiss }: ToastProps) {
  const [isFading, setIsFading] = useState(false);

  // The countdown belongs to the message, not to the identity of the callback.
  // Keying the timers on onDismiss meant an inline arrow from the caller
  // restarted them on every unrelated re-render, so the toast could linger or
  // vanish early depending on what else the page happened to be doing.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // A replacement message deserves its own full read, so restart the fade.
  const [timedMessage, setTimedMessage] = useState(message);
  if (timedMessage !== message) {
    setTimedMessage(message);
    setIsFading(false);
  }

  useEffect(() => {
    const fade = setTimeout(() => setIsFading(true), VISIBLE_MS);
    const remove = setTimeout(
      () => onDismissRef.current(),
      VISIBLE_MS + FADE_MS,
    );

    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [timedMessage]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-8 z-50 flex justify-center px-4"
      role="status"
    >
      <p
        className={`rounded-[8px] border border-pink-400/25 bg-surface/95 px-4 py-3 text-center font-mono text-sm text-text-secondary shadow-[0_0_40px_-12px_rgb(219_39_119_/_0.6)] transition-opacity duration-[400ms] ${
          isFading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {message}
      </p>
    </div>
  );
}

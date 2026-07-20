import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import AnimatedBackground from './AnimatedBackground';
import BenjiTerminal from './BenjiTerminal';
import RaceBot from './RaceBot';

type LandingPageProps = {
  onPlay: () => void;
};

// Framed with the full body in view + some extra room above
// because the "confused" expression floats "?" mark above the skull
const CAMERA_POSITION: [number, number, number] = [0, 0.58, 2.17];
const CAMERA_TARGET: [number, number, number] = [0, 0.45, 0];

// A separate framing for mobile and tablet
const MOBILE_CAMERA_POSITION: [number, number, number] = [0, 0.5, 1.7];
const MOBILE_CAMERA_TARGET: [number, number, number] = [0, 0.56, 0];

function PlayIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 28 40"
    >
      <path d="M2 2 L26 20 L2 38 Z" />
    </svg>
  );
}

function PlayCta({
  playRef,
  onPlay,
  className = '',
}: {
  playRef: React.RefObject<HTMLButtonElement | null>;
  onPlay: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-start gap-3 ${className}`}>
      <p className="font-mono text-[14px] font-bold text-pink-400">
        {'// c’mon, hit it already'}
      </p>
      <button
        ref={playRef}
        className="flex h-[clamp(56px,9dvh,76px)] w-[210px] items-center justify-center gap-3 rounded-[10px] bg-gradient-to-br from-pink-400 to-purple-500 text-[32px] font-bold text-white shadow-[0_0_28px_-6px_rgb(219_39_119_/_0.85)] transition hover:opacity-95 lg:h-[96px] lg:w-[252px] lg:text-[40px]"
        onClick={onPlay}
        type="button"
      >
        <PlayIcon className="h-[34px] w-[24px] lg:h-[46px] lg:w-[32px]" />
        Play
      </button>
    </div>
  );
}

export default function LandingPage({ onPlay }: LandingPageProps) {
  const playRef = useRef<HTMLButtonElement>(null);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia?.('(min-width: 1024px)').matches ?? true,
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-surface font-sans text-text-primary lg:h-[100dvh] lg:min-h-0 lg:w-screen lg:overflow-hidden">
      {/* From the lg breakpoint up this becomes the 1920x1080 frame
      */}
      <div className="lg:absolute lg:left-0 lg:top-0 lg:h-[1080px] lg:w-[1920px] lg:origin-top-left lg:[transform:scale(var(--auth-login-scale))]">
        <AnimatedBackground />

        {/* This wrapper only exists to stack things vertically on mobile
         */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-5 pb-3 pt-3 lg:contents">
          <div className="relative z-20 lg:absolute lg:left-10 lg:top-6">
            <Logo />
          </div>

          <div className="flex flex-1 flex-col items-center justify-end gap-[clamp(0.5rem,1.5dvh,1rem)] py-3 lg:contents">
            <BenjiTerminal className="w-full max-w-[520px] lg:absolute lg:left-[42px] lg:top-[250px] lg:w-[600px] lg:max-w-none" />

            <PlayCta
              playRef={playRef}
              onPlay={onPlay}
              className="lg:absolute lg:left-[1432px] lg:top-[479px] lg:w-[252px]"
            />

            <div className="relative h-[clamp(240px,42dvh,350px)] w-full max-w-[380px] lg:absolute lg:left-[390px] lg:top-[-45px] lg:h-[1742px] lg:w-[1235px] lg:max-w-none">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/20 blur-[110px] lg:h-[420px] lg:w-[420px] lg:blur-[130px]" />
              <RaceBot
                pointTargetRef={playRef}
                cameraPosition={
                  isDesktop ? CAMERA_POSITION : MOBILE_CAMERA_POSITION
                }
                cameraTarget={isDesktop ? CAMERA_TARGET : MOBILE_CAMERA_TARGET}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

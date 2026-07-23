import { useEffect, useRef, useState } from 'react';

// Colors used to fake syntax highlighting in the typed-out lines below
const kw = 'text-[#7aa2f7]'; // keywords / methods
const op = 'text-[#8a86a0]'; // punctuation
const str = 'text-[#7dcfa0]'; // strings
const com = 'text-[#6a6678]'; // comments
const id = 'text-[#c9c7d6]'; // identifiers
const obj = 'text-[#c084fc]'; // objects
const nag = 'text-[#fbbf24]'; // Benji's nag lines

type Segment = { text: string; cls?: string };
type Line = Segment[];

// Benji's opening monologue typed out once when the page first loads
const BASE_LINES: Line[] = [
  [
    { text: 'System', cls: kw },
    { text: '.', cls: op },
    { text: 'out', cls: id },
    { text: '.', cls: op },
    { text: 'println', cls: kw },
    { text: '(', cls: op },
    { text: '"Hi, I’m Benji."', cls: str },
    { text: ');', cls: op },
  ],
  [{ text: '// your coach. lucky you.', cls: com }],
  [{ text: '// I’ll make you a real dev.', cls: com }],
  [{ text: '// probably. no promises.', cls: com }],
  [
    { text: 'ready', cls: id },
    { text: ' = ', cls: op },
    { text: 'you', cls: obj },
    { text: '.', cls: op },
    { text: 'stopStalling', cls: kw },
    { text: '();', cls: op },
    { text: '// press play →', cls: com },
  ],
  [],
  [{ text: '// still reading? cute.', cls: com }],
  [
    { text: 'while ', cls: kw },
    { text: '(!', cls: op },
    { text: 'user', cls: obj },
    { text: '.', cls: op },
    { text: 'pressedPlay', cls: kw },
    { text: '()) {', cls: op },
  ],
  [
    { text: '  Benji', cls: obj },
    { text: '.', cls: op },
    { text: 'motivate', cls: kw },
    { text: '(', cls: op },
    { text: '"we don’t learn by staring."', cls: str },
    { text: ');', cls: op },
  ],
  [
    { text: '  excuses', cls: id },
    { text: '.', cls: op },
    { text: 'clear', cls: kw },
    { text: '();', cls: op },
  ],
  [
    { text: '  skill', cls: id },
    { text: '++;', cls: op },
    { text: '// only if you START', cls: com },
  ],
  [{ text: '}', cls: op }],
];

const NAG_LINES: Line[] = [
  [{ text: '// c’mon, I believe in you. mostly.', cls: nag }],
  [{ text: '// the code won’t write itself. yet.', cls: nag }],
  [{ text: '// every pro was once your level. sad, I know.', cls: nag }],
  [{ text: '// one click. even you can manage that.', cls: nag }],
  [{ text: '// I’ll be nice once you actually try.', cls: nag }],
  [{ text: '// legends aren’t born. they press play.', cls: nag }],
  [{ text: '// your keyboard is right there. hello?', cls: nag }],
  [{ text: '// I’ve seen snails ship faster than this.', cls: nag }],
  [{ text: '// still here? bold strategy.', cls: nag }],
  [{ text: '// fine, keep reading comments. very productive.', cls: nag }],
  [{ text: '// this line updates itself. you, however...', cls: nag }],
  [{ text: '// tick tock. the compiler isn’t getting younger.', cls: nag }],
  [{ text: '// I timed this pause. it’s been a while.', cls: nag }],
  [{ text: '// plot twist: you actually click it.', cls: nag }],
  [{ text: '// residual confidence detected. use it.', cls: nag }],
  [{ text: '// at this rate the loop retires before you start.', cls: nag }],
  [{ text: '// blinking at the screen isn’t a strategy.', cls: nag }],
  [{ text: '// your keyboard is right there. use it.', cls: nag }],
  [{ text: '// I’ve seen tutorials watched slower. impressive.', cls: nag }],
  [{ text: '// still here? the buffering ends when YOU start.', cls: nag }],
  [{ text: '// I could’ve compiled Linux in this time.', cls: nag }],
  [{ text: '// hesitation is just a slow way to lose.', cls: nag }],
  [{ text: '// tick tock. the leaderboard isn’t waiting.', cls: nag }],
  [{ text: '// bold of you to think staring counts as practice.', cls: nag }],
  [{ text: '// my other student already finished. just saying.', cls: nag }],
  [{ text: '// press play or I’m telling everyone you froze.', cls: nag }],
];

const CHAR_MS = 22; // per-character typing speed
const BLANK_LINE_MS = 260; // pause for an empty line
const LINE_HOLD_MS = 900; // pause after a code line finishes
const NAG_HOLD_MS = 1700; // pause after a nag line finishes
const LINE_GAP_MS = 300; // pause before the next line starts typing
const MAX_LINES = 40; // cap so the scroll buffer stays bounded
const NEAR_BOTTOM_PX = 32; // how close to the bottom counts as "still following"

function lineLength(line: Line) {
  return line.reduce((sum, seg) => sum + seg.text.length, 0);
}

function sliceLine(line: Line, count: number): Segment[] {
  const out: Segment[] = [];
  let remaining = count;
  for (const seg of line) {
    if (remaining <= 0) break;
    if (seg.text.length <= remaining) {
      out.push(seg);
      remaining -= seg.text.length;
    } else {
      out.push({ text: seg.text.slice(0, remaining), cls: seg.cls });
      remaining = 0;
    }
  }
  return out;
}

function renderSegments(segments: Segment[]) {
  return segments.map((seg, i) => (
    <span key={i} className={seg.cls}>
      {seg.text}
    </span>
  ));
}

function prefersReducedMotion() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

const BUBBLE_PATH =
  'M80 66C80 57.1635 87.1634 50 96 50H672C680.837 50 688 57.1634 688 66V441.386C688 444.401 688.852 447.354 690.457 449.905L700.778 466.314C703.606 470.809 700.196 476.625 694.893 476.353C691.144 476.161 688 479.148 688 482.902V498C688 506.837 680.837 514 672 514H96C87.1635 514 80 506.837 80 498V66Z';

type BenjiTerminalProps = {
  className?: string;
  bubblePath?: string;
  bubbleViewBox?: string;
  baseLines?: Line[];
  nagLines?: Line[];
  onClick?: () => void;
};

export type { Line as BenjiLine, Segment as BenjiSegment };

export default function BenjiTerminal({
  className = '',
  bubblePath,
  bubbleViewBox,
  baseLines,
  nagLines,
  onClick,
}: BenjiTerminalProps) {
  const effectiveBase = baseLines ?? BASE_LINES;
  const effectiveNag = nagLines ?? NAG_LINES;
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();
  const [completed, setCompleted] = useState<Line[]>(() =>
    reducedMotion ? effectiveBase : [],
  );
  const [partial, setPartial] = useState<Segment[]>([]);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let phase: 'base' | 'nag' = 'base';
    let index = 0;
    let charCount = 0;
    const history: Line[] = [];
    let initialized = false;

    const currentLine = (): Line =>
      phase === 'base'
        ? effectiveBase[index]
        : effectiveNag[index % effectiveNag.length];

    const commitLine = () => {
      history.push(currentLine());
      if (history.length > MAX_LINES) history.shift();
      setCompleted([...history]);
      setPartial([]);

      charCount = 0;
      if (phase === 'base') {
        index += 1;
        if (index >= effectiveBase.length) {
          phase = 'nag';
          index = 0;
        }
      } else {
        index += 1;
      }
      timer = setTimeout(step, LINE_GAP_MS);
    };

    const step = () => {
      if (cancelled) return;

      if (!initialized) {
        initialized = true;
        setCompleted([]);
        setPartial([]);
      }

      const line = currentLine();
      const total = lineLength(line);

      if (total === 0) {
        timer = setTimeout(commitLine, BLANK_LINE_MS);
        return;
      }

      charCount += 1;
      setPartial(sliceLine(line, charCount));

      if (charCount < total) {
        timer = setTimeout(step, CHAR_MS);
        return;
      }
      const hold = phase === 'nag' ? NAG_HOLD_MS : LINE_HOLD_MS;
      timer = setTimeout(commitLine, hold);
    };

    timer = setTimeout(step, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveBase, effectiveNag, reducedMotion]);

  // If someone scrolls up to reread something stop auto-scrolling so we
  // don't yank them back down, resume once they scroll near the bottom again
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      el.scrollTop = el.scrollHeight;
    }
  }, [completed, partial]);

  return (
    <div
      className={`relative h-[calc(clamp(180px,24dvh,300px)_+_16px)] lg:h-[466px] ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={onClick ? 'Click Benji to explain the code' : undefined}
    >
      <style>
        {`
          .benji-scroll { scrollbar-width: thin; scrollbar-color: rgba(244,114,182,0.4) transparent; }
          .benji-scroll::-webkit-scrollbar { width: 6px; }
          .benji-scroll::-webkit-scrollbar-track { background: transparent; }
          .benji-scroll::-webkit-scrollbar-thumb { background: rgba(244,114,182,0.4); border-radius: 999px; }
          .benji-scroll::-webkit-scrollbar-thumb:hover { background: rgba(244,114,182,0.65); }
        `}
      </style>

      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 26px 54px rgba(219,39,119,0.35))' }}
        viewBox={bubbleViewBox ?? '78 48 624 468'}
      >
        <path
          d={bubblePath ?? BUBBLE_PATH}
          fill="#0a0812"
          fillOpacity="0.96"
          stroke="rgba(244,114,182,0.22)"
          strokeWidth="1.6"
        />
      </svg>

      <div className="relative z-10 mr-4 flex h-[clamp(180px,24dvh,300px)] flex-col lg:h-[450px]">
        <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-6 font-mono text-[13px]">
          <p>
            <span className="text-[#8b88a3]">BENJI.exe </span>
            <span className="text-[#5b5870]">// v1.0</span>
          </p>
          <p className="flex items-center gap-2 text-[#f9a8d4]">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#f9a8d4]" />
            TYPING…
          </p>
        </div>
        <div className="mx-6 h-px shrink-0 bg-pink-400/12" />

        <div
          ref={scrollRef}
          className="benji-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6"
        >
          <pre className="font-mono text-[clamp(12px,1.05vw,17px)] leading-[1.7] whitespace-pre-wrap break-words">
            <code>
              {completed.map((line, i) => (
                <span key={i}>
                  {renderSegments(line)}
                  {'\n'}
                </span>
              ))}
              <span>
                {renderSegments(partial)}
                <span className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-[#e7e5ef]" />
              </span>
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BenjiLine } from '@/features/landing/BenjiTerminal';
import {
  fetchExplanation,
  ExplainError,
  type ExplanationData,
  type ExplainErrorKind,
} from './explainApi';

const kw = 'text-[#7aa2f7]';
const op = 'text-[#8a86a0]';
const str = 'text-[#7dcfa0]';
const com = 'text-[#6a6678]';
const obj = 'text-[#c084fc]';
const nag = 'text-[#fbbf24]';

type ExplainPhase = 'idle' | 'loading' | 'success' | 'error';

const sessionCache = new Map<string, ExplanationData>();

export function clearExplainCache() {
  sessionCache.clear();
}

function explanationToLines(data: ExplanationData): BenjiLine[] {
  const lines: BenjiLine[] = [];

  lines.push([{ text: '// alright, let me dumb this down for you.', cls: com }]);
  lines.push([]);

  lines.push([
    { text: '// ', cls: com },
    { text: 'Summary — the part you should\'ve figured out', cls: nag },
  ]);
  lines.push([{ text: data.summary, cls: str }]);
  lines.push([]);

  lines.push([
    { text: '// ', cls: com },
    { text: 'Step by step — since you need hand-holding', cls: nag },
  ]);
  data.stepByStep.forEach((step, i) => {
    lines.push([
      { text: `${i + 1}. `, cls: op },
      { text: step, cls: 'text-[#c9c7d6]' },
    ]);
  });
  lines.push([]);

  lines.push([
    { text: '// ', cls: com },
    { text: 'Concepts — pay attention this time', cls: nag },
  ]);
  data.concepts.forEach((c) => {
    lines.push([
      { text: '→ ', cls: op },
      { text: c, cls: obj },
    ]);
  });
  lines.push([]);

  lines.push([
    { text: '// ', cls: com },
    { text: 'Best practices — take notes, rookie', cls: nag },
  ]);
  data.bestPractices.forEach((bp) => {
    lines.push([
      { text: '✦ ', cls: kw },
      { text: bp, cls: str },
    ]);
  });

  lines.push([]);
  lines.push([{ text: "// you're welcome. now go practice.", cls: com }]);

  return lines;
}

const NO_EXPLANATION_ROASTS: string[] = [
  "wow, nobody bothered to explain this one. guess you're on your own, champ.",
  "no explanation exists yet. even I can't help you with nothing.",
  "the admin hasn't explained this one. probably too busy having a life.",
  "explanation not found. just like your coding skills.",
  "nothing here yet. try staring at the code harder, maybe it'll click.",
  "no explanation. looks like we both get to suffer in silence.",
  "this snippet has no explanation. welcome to the deep end, kid.",
  "explanation? what explanation? you're flying blind on this one.",
  "the admin forgot this one. or maybe they just don't care. who knows.",
  "no explanation available. guess you'll have to use that brain thing.",
];

function errorToLines(kind: ExplainErrorKind): BenjiLine[] {
  if (kind === 'not-found') {
    const roast = NO_EXPLANATION_ROASTS[Math.floor(Math.random() * NO_EXPLANATION_ROASTS.length)];
    return [
      [{ text: `// ${roast}`, cls: nag }],
    ];
  }

  const messages: Record<ExplainErrorKind, string> = {
    'auth-expired': 'session expired. log in again, slacker.',
    forbidden: "explanation not available for your account. tough luck.",
    'rate-limited': 'slow down, speed demon. wait a moment.',
    'provider-unavailable': "AI service is down. even robots need a break.",
    'not-found': '',
    generic: 'something broke. probably not my fault.',
  };
  return [[{ text: `// error: ${messages[kind]}`, cls: 'text-rose-400' }]];
}

function loadingLines(): BenjiLine[] {
  return [
    [
      { text: 'Benji', cls: obj },
      { text: '.', cls: op },
      { text: 'think', cls: kw },
      { text: '();', cls: op },
    ],
    [{ text: '// hold on, reading your mess...', cls: com }],
  ];
}

export function useExplainCode(snippetId: string | null) {
  const [phase, setPhase] = useState<ExplainPhase>('idle');
  const [lines, setLines] = useState<BenjiLine[] | null>(null);
  const prevSnippetId = useRef(snippetId);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (prevSnippetId.current !== snippetId) {
      prevSnippetId.current = snippetId;
      inFlightRef.current = false;
      setPhase('idle');
      setLines(null);
    }
  }, [snippetId]);

  const requestExplanation = useCallback(async () => {
    if (!snippetId) return;
    if (inFlightRef.current) return;

    const cached = sessionCache.get(snippetId);
    if (cached) {
      setLines(explanationToLines(cached));
      setPhase('success');
      return;
    }

    inFlightRef.current = true;
    setPhase('loading');
    setLines(loadingLines());

    try {
      const data = await fetchExplanation(snippetId);
      sessionCache.set(snippetId, data);
      setLines(explanationToLines(data));
      setPhase('success');
    } catch (error) {
      if (error instanceof ExplainError) {
        setLines(errorToLines(error.kind));
      } else {
        setLines(errorToLines('generic'));
      }
      setPhase('error');
    } finally {
      inFlightRef.current = false;
    }
  }, [snippetId]);

  return { phase, lines, requestExplanation };
}

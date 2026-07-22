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

function explanationToLines(data: ExplanationData): BenjiLine[] {
  const lines: BenjiLine[] = [];

  lines.push([
    { text: '// ', cls: com },
    { text: 'Summary', cls: nag },
  ]);
  lines.push([{ text: data.summary, cls: str }]);
  lines.push([]);

  lines.push([
    { text: '// ', cls: com },
    { text: 'Step by step', cls: nag },
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
    { text: 'Concepts', cls: nag },
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
    { text: 'Best practices', cls: nag },
  ]);
  data.bestPractices.forEach((bp) => {
    lines.push([
      { text: '✦ ', cls: kw },
      { text: bp, cls: str },
    ]);
  });

  return lines;
}

function errorToLines(kind: ExplainErrorKind): BenjiLine[] {
  const messages: Record<ExplainErrorKind, string> = {
    'auth-expired': 'session expired. log in again.',
    forbidden: 'explanation not available for your account yet.',
    'rate-limited': 'too many requests. wait a moment.',
    'provider-unavailable': 'AI service is down. try later.',
    'not-found': 'no explanation available for this snippet yet.',
    generic: 'something went wrong. try again.',
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
    [{ text: '// analyzing code...', cls: com }],
  ];
}

export function useExplainCode(snippetId: string | null) {
  const [phase, setPhase] = useState<ExplainPhase>('idle');
  const [lines, setLines] = useState<BenjiLine[] | null>(null);
  const prevSnippetId = useRef(snippetId);

  useEffect(() => {
    if (prevSnippetId.current !== snippetId) {
      prevSnippetId.current = snippetId;
      setPhase('idle');
      setLines(null);
    }
  }, [snippetId]);

  const requestExplanation = useCallback(async () => {
    if (!snippetId) return;
    if (phase === 'loading') return;

    const cached = sessionCache.get(snippetId);
    if (cached) {
      setLines(explanationToLines(cached));
      setPhase('success');
      return;
    }

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
    }
  }, [snippetId, phase]);

  return { phase, lines, requestExplanation };
}

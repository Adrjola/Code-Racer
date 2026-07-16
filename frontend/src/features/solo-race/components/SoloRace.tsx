import React, { useRef, useEffect } from 'react';
import { useExactCodeTypingEngine } from '../hooks/useExactCodeTypingEngine';
import { useCountdown } from '../hooks/useCountdown';
import type { RaceSnippet } from '../types/race.types';

interface SoloRaceProps {
  snippet: RaceSnippet;
  startedAt: string;
}

export function processBeforeInputData(
  isLocked: boolean,
  data: string | null | undefined,
  handleInput: (char: string) => void,
  preventDefault: () => void,
) {
  if (isLocked) return;
  if (!data) return;

  preventDefault();
  for (const char of data) {
    handleInput(char);
  }
}

export const SoloRace: React.FC<SoloRaceProps> = ({ snippet, startedAt }) => {
  const { state, handleInput, handleDelete } = useExactCodeTypingEngine(snippet, startedAt);
  const countdown = useCountdown(startedAt);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const isLocked = countdown !== null && countdown > 0;

  const focusInput = () => {
    /* v8 ignore next */
    if (!isLocked) {
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!isLocked) {
      focusInput();
    }
  }, [isLocked]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleInput('\t');
    }
  };

  const preventDefault = (e: React.SyntheticEvent) => e.preventDefault();

  // Rendering characters
  const renderCode = () => {
    const { targetCode, acceptedPrefix, currentInput } = state;
    const remaining = targetCode.slice(acceptedPrefix.length);
    const incorrectPart = currentInput;
    
    // We need to be careful with rest calculation if currentInput has multi-byte chars
    const incorrectCharCount = Array.from(incorrectPart).length;
    
    // Slice target remaining by the number of characters in incorrectPart
    const targetArray = Array.from(remaining);
    const rest = targetArray.slice(incorrectCharCount).join('');

    return (
      <pre className="font-mono text-lg leading-relaxed whitespace-pre-wrap break-all select-none">
        <span className="text-slate-100">{acceptedPrefix}</span>
        {incorrectPart && (
          <span className="bg-rose-500/25 text-rose-400 underline decoration-rose-400">
            {incorrectPart}
          </span>
        )}
        <span className="relative text-slate-200/40">
          {!incorrectPart && !isLocked && (
             <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-emerald-400 animate-pulse" />
          )}
          {rest}
        </span>
      </pre>
    );
  };

  return (
    <div 
      className="w-full max-w-4xl p-8 bg-slate-900 rounded-xl shadow-2xl border border-slate-800"
      onClick={focusInput}
    >
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-slate-400 font-medium">
            Type: <span className="text-emerald-400">{snippet.type}</span>
          </div>
          {isLocked && (
            <div className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-sm font-bold animate-pulse">
              Starts in {countdown}s
            </div>
          )}
        </div>
        {state.isFinished && (
          <div className="text-emerald-400 font-bold animate-bounce">
            Race Finished!
          </div>
        )}
      </div>

      <div className={`relative min-h-[200px] p-6 bg-slate-950 rounded-lg border transition-colors ${
        isLocked ? 'border-slate-800 opacity-50' : 'border-slate-800 focus-within:border-emerald-500/50'
      }`}>
        {renderCode()}
        
        <textarea
          ref={inputRef}
          readOnly={isLocked}
          className="absolute inset-0 w-full h-full opacity-0 cursor-default resize-none"
          onKeyDown={handleKeyDown}
          /* v8 ignore next */
          onBeforeInput={(e: React.CompositionEvent<HTMLTextAreaElement> | any) =>
            processBeforeInputData(isLocked, e.data, handleInput, () => e.preventDefault())
          }
          onPaste={preventDefault}
          onDrop={preventDefault}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {!isLocked && (
        <button 
          onClick={focusInput}
          className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors uppercase tracking-widest"
        >
          Click to focus or press any key to type
        </button>
      )}
    </div>
  );
};

export function SoloRaceKeyboardHints() {
  return (
    <div className="mt-0 flex items-center justify-center gap-10 text-base text-[#7E779A]">
      <div className="flex items-center gap-3">
        <span className="rounded-lg border border-[#3E3758] bg-[#18142A] px-4 py-1 text-lg text-[#B6AFCF]">
          ctrl
        </span>
        <span>+</span>
        <span className="rounded-lg border border-[#3E3758] bg-[#18142A] px-4 py-1 text-lg text-[#B6AFCF]">
          enter
        </span>
        <span>restart race</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-lg border border-[#3E3758] bg-[#18142A] px-4 py-1 text-lg text-[#B6AFCF]">
          esc
        </span>
        <span>back to menu</span>
      </div>
    </div>
  );
}

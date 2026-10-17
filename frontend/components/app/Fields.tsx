"use client";

import type { Language, Relation } from "@/lib/book-store";

/** Form pieces shared by onboarding and "Add another elder". Dark glass style. */

const RELATIONS: Relation[] = ["Nani", "Nana", "Dadi", "Dada", "Other"];
const LANGUAGES: { id: Language; ready: boolean }[] = [
  { id: "Urdu", ready: true },
  { id: "English", ready: true },
  { id: "Punjabi", ready: false },
  { id: "Sindhi", ready: false },
  { id: "Pashto", ready: false },
];

export type ElderDraft = { name: string; relation: Relation; language: Language; birthplace: string; birthYear: string };

export const EMPTY_ELDER: ElderDraft = { name: "", relation: "Nani", language: "Urdu", birthplace: "", birthYear: "" };

/** Turns the form's draft into the saved elder shape, trimming and capping lengths. */
export function cleanElder(d: ElderDraft) {
  return {
    name: d.name.trim().slice(0, 60),
    relation: d.relation,
    language: d.language,
    birthplace: d.birthplace.trim().slice(0, 60) || undefined,
    birthYear: d.birthYear.replace(/[^0-9]/g, "").slice(0, 4) || undefined,
  };
}

export function ElderFields({ value, onChange, autoFocus }: { value: ElderDraft; onChange: (v: ElderDraft) => void; autoFocus?: boolean }) {
  const set = (patch: Partial<ElderDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-7">
      <TextInput label="Their name" value={value.name} onChange={(name) => set({ name })} placeholder="Zubaida" autoFocus={autoFocus} />
      <ChipGroup label="They are your">
        {RELATIONS.map((r) => (
          <Chip key={r} active={value.relation === r} onClick={() => set({ relation: r })}>
            {r}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup label="Language they'll speak in">
        {LANGUAGES.map((l) => (
          <Chip key={l.id} active={value.language === l.id} disabled={!l.ready} onClick={() => set({ language: l.id })}>
            {l.id}
            {!l.ready && <span className="ml-1.5 rounded-md bg-white/10 px-1.5 text-[11px] font-bold">Soon</span>}
          </Chip>
        ))}
      </ChipGroup>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Where they were born (optional)" value={value.birthplace} onChange={(birthplace) => set({ birthplace })} placeholder="Ambala" />
        <TextInput label="Year they were born (optional)" value={value.birthYear} onChange={(birthYear) => set({ birthYear })} placeholder="1941" inputMode="numeric" />
      </div>
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-moon">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        className="font-display mt-2 h-14 w-full rounded-2xl border border-white/15 bg-white/5 px-5 text-xl text-moon placeholder:text-moon/30 focus:border-lantern focus:outline-none"
      />
    </label>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-moon">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex h-11 items-center rounded-full px-5 font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? "bg-lantern text-ink" : "bg-white/5 text-moon hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

import { Save } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";

import { ValueCombobox, type ValueOption } from "../value-combobox";

interface PlacementFieldProps {
  label: string;
  onChange: (position: number, value: string) => void;
  options: ValueOption[];
  position: number;
  value: string;
}

interface Props {
  articleOptions: ValueOption[];
  leadId: string;
  leadOptions: ValueOption[];
  onLeadChange: (value: string) => void;
  onSave: () => void;
  onSecondaryChange: (position: number, value: string) => void;
  secondaryIds: string[];
  state: "idle" | "saving" | "saved" | "error";
}

export const AUTOMATIC_PLACEMENT = "automatic";
const SUPPORTING_SLOTS = ["first", "second", "third", "fourth"] as const;

function PlacementField({
  label,
  onChange,
  options,
  position,
  value,
}: PlacementFieldProps) {
  const inputId = `homepage-supporting-${position}`;
  const updatePlacement = useCallback(
    (nextValue: string) => onChange(position, nextValue),
    [onChange, position]
  );

  return (
    <label
      className="grid gap-1.5 text-muted-foreground text-xs"
      htmlFor={inputId}
    >
      {label}
      <ValueCombobox
        ariaLabel={label}
        id={inputId}
        onChange={updatePlacement}
        options={options}
        value={value || AUTOMATIC_PLACEMENT}
      />
    </label>
  );
}

export function HomepageLayoutPanel({
  articleOptions,
  leadId,
  leadOptions,
  onLeadChange,
  onSave,
  onSecondaryChange,
  secondaryIds,
  state,
}: Props) {
  return (
    <section
      aria-label="Homepage layout"
      className="mb-5 grid grid-cols-[minmax(180px,1.2fr)_repeat(5,minmax(150px,1fr))_auto] items-end gap-3 rounded-lg border bg-card p-4 shadow-xs max-sm:grid-cols-1 max-lg:grid-cols-2 [&_[data-slot=input-group]]:min-h-10 [&_[data-slot=input-group]]:w-full"
    >
      <div className="grid gap-1.5 font-semibold text-[10px]">
        <strong>Homepage placements</strong>
        <span className="font-normal text-muted-foreground text-xs">
          Choose one lead story and up to four supporting stories.
        </span>
      </div>
      <label
        className="grid gap-1.5 text-muted-foreground text-xs"
        htmlFor="homepage-lead-story"
      >
        Lead story
        <ValueCombobox
          ariaLabel="Lead story"
          id="homepage-lead-story"
          onChange={onLeadChange}
          options={leadOptions}
          value={leadId || AUTOMATIC_PLACEMENT}
        />
      </label>
      {SUPPORTING_SLOTS.map((slot, position) => (
        <PlacementField
          key={slot}
          label={`Supporting story ${position + 1}`}
          onChange={onSecondaryChange}
          options={articleOptions}
          position={position}
          value={secondaryIds[position] ?? ""}
        />
      ))}
      <Button disabled={state === "saving"} onClick={onSave}>
        <Save /> {state === "saving" ? "Saving…" : "Save layout"}
      </Button>
      {state === "saved" ? (
        <span className="self-center text-xs">Homepage layout saved.</span>
      ) : null}
      {state === "error" ? (
        <span className="self-center text-destructive text-xs">
          Homepage placements require a valid image and a successful save.
        </span>
      ) : null}
    </section>
  );
}

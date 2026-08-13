import { useCallback } from "react";

import {
  ValueCombobox,
  type ValueOption,
} from "@/editorial/shared/value-combobox";

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
  onSecondaryChange: (position: number, value: string) => void;
  secondaryIds: string[];
}

export const AUTOMATIC_PLACEMENT = "automatic";
const SUPPORTING_SLOTS = ["first", "second", "third", "fourth"] as const;
const storyPickerClassName =
  "[&_[data-slot=input-group]]:h-9 [&_[data-slot=input-group]]:w-full";

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
        className={storyPickerClassName}
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
  onSecondaryChange,
  secondaryIds,
}: Props) {
  return (
    <section aria-label="Homepage layout" className="grid">
      <section className="grid grid-cols-[220px_minmax(0,680px)] gap-8 border-b px-[42px] py-8 max-inventory-compact:grid-cols-[180px_minmax(0,1fr)] max-inventory-mobile:grid-cols-1 max-inventory-mobile:gap-4 max-inventory-compact:px-6 max-inventory-mobile:px-4">
        <div>
          <h2 className="m-0 font-semibold text-base">Lead story</h2>
          <p className="mt-2 mb-0 text-muted-foreground text-xs leading-5">
            The primary story at the top of the publication homepage.
          </p>
        </div>
        <label
          className="grid gap-2 font-medium text-sm"
          htmlFor="homepage-lead-story"
        >
          Story
          <ValueCombobox
            ariaLabel="Lead story"
            className={storyPickerClassName}
            id="homepage-lead-story"
            onChange={onLeadChange}
            options={leadOptions}
            value={leadId || AUTOMATIC_PLACEMENT}
          />
        </label>
      </section>
      <section className="grid grid-cols-[220px_minmax(0,1fr)] gap-8 px-[42px] py-8 max-inventory-compact:grid-cols-[180px_minmax(0,1fr)] max-inventory-mobile:grid-cols-1 max-inventory-mobile:gap-4 max-inventory-compact:px-6 max-inventory-mobile:px-4">
        <div>
          <h2 className="m-0 font-semibold text-base">Supporting stories</h2>
          <p className="mt-2 mb-0 text-muted-foreground text-xs leading-5">
            Four stories shown beside and below the lead story.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 max-inventory-compact:grid-cols-2 max-inventory-mobile:grid-cols-1">
          {SUPPORTING_SLOTS.map((slot, position) => (
            <PlacementField
              key={slot}
              label={`Position ${position + 1}`}
              onChange={onSecondaryChange}
              options={articleOptions}
              position={position}
              value={secondaryIds[position] ?? ""}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

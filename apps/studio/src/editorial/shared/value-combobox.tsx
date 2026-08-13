import { useCallback, useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export interface ValueOption {
  label: string;
  value: string;
}

interface Props {
  ariaLabel: string;
  className?: string;
  emptyMessage?: string;
  id?: string;
  onChange: (value: string) => void;
  options: ValueOption[];
  resultLimit?: number;
  value: string;
}

const getOptionLabel = (option: ValueOption): string => option.label;

export function ValueCombobox({
  ariaLabel,
  className,
  emptyMessage = "No matching options.",
  id,
  onChange,
  options,
  resultLimit = 24,
  value,
}: Props) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );
  const updateValue = useCallback(
    (nextOption: ValueOption | null) => {
      if (nextOption) {
        onChange(nextOption.value);
      }
    },
    [onChange]
  );

  return (
    <div className={className}>
      <Combobox
        autoHighlight
        items={options}
        itemToStringValue={getOptionLabel}
        limit={resultLimit}
        onValueChange={updateValue}
        value={selectedOption}
      >
        <ComboboxInput aria-label={ariaLabel} id={id} placeholder={ariaLabel} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          {options.length > resultLimit ? (
            <p className="m-0 border-t px-2.5 py-2 text-[11px] text-muted-foreground">
              Recent options appear first. Type to search all{" "}
              {options.length.toLocaleString()} choices.
            </p>
          ) : null}
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

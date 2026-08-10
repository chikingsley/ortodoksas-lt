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
        items={options}
        itemToStringValue={getOptionLabel}
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
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

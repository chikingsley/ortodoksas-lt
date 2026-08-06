import { getSectionOptions } from "@ortodoksas-lt/content/sections";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

interface Props {
  id?: string;
  onChange: (value: string) => void;
  options?: Iterable<string>;
  value: string;
}

export const SectionCombobox = ({
  id,
  onChange,
  options = [],
  value,
}: Props) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const sectionOptions = useMemo(
    () => getSectionOptions([...options, value]),
    [options, value]
  );

  const addSection = useCallback(() => {
    const nextSection = draft.trim();
    if (nextSection.length === 0) {
      return;
    }
    onChange(nextSection);
    setDraft("");
    setAdding(false);
  }, [draft, onChange]);
  const selectSection = useCallback(
    (nextValue: string | null) => onChange(nextValue ?? ""),
    [onChange]
  );
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    []
  );
  const submitFromKeyboard = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addSection();
      }
    },
    [addSection]
  );
  const startAdding = useCallback(() => setAdding(true), []);
  const cancelAdding = useCallback(() => {
    setAdding(false);
    setDraft("");
  }, []);

  return (
    <div className="section-combobox">
      <Combobox
        items={sectionOptions}
        onValueChange={selectSection}
        value={value || null}
      >
        <ComboboxInput id={id} placeholder="Choose a section" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No matching sections.</ComboboxEmpty>
          <ComboboxList>
            {(section) => (
              <ComboboxItem key={section} value={section}>
                {section}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {adding ? (
        <div className="section-combobox-add">
          <Input
            aria-label="New section name"
            autoFocus
            maxLength={160}
            onChange={updateDraft}
            onKeyDown={submitFromKeyboard}
            placeholder="New section name"
            value={draft}
          />
          <Button onClick={addSection} size="sm" type="button">
            Add
          </Button>
          <Button
            onClick={cancelAdding}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          className="section-combobox-create"
          onClick={startAdding}
          size="sm"
          type="button"
          variant="ghost"
        >
          Add new section
        </Button>
      )}
      <small>Select a canonical section or add a deliberate new one.</small>
    </div>
  );
};

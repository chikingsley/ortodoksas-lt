import {
  getSectionLabel,
  getSectionOptions,
  type SectionLocale,
} from "@ortodoksas-lt/content/sections";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  id?: string;
  language?: string;
  onChange: (value: string) => void;
  options?: Iterable<string>;
  value: string;
}

export const SectionSelect = ({
  id,
  language = "lt",
  onChange,
  options = [],
  value,
}: Props) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const sectionOptions = useMemo(
    () =>
      getSectionOptions([...options, value]).map((section) => ({
        label: getSectionLabel(section, language as SectionLocale),
        value: section,
      })),
    [language, options, value]
  );
  const selectedSection = sectionOptions.find(
    (section) => section.value === value
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
    (nextValue: string | null) => {
      if (nextValue) {
        onChange(nextValue);
      }
    },
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
    <div>
      <Select
        onValueChange={selectSection}
        value={selectedSection?.value ?? value}
      >
        <SelectTrigger aria-label="Section" className="w-full" id={id}>
          <SelectValue>
            {selectedSection?.label ?? "Choose a section"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {sectionOptions.map((section) => (
            <SelectItem key={section.value} value={section.value}>
              {section.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {adding ? (
        <div className="mt-[7px] grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
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
          className="mt-[5px]"
          onClick={startAdding}
          size="sm"
          type="button"
          variant="ghost"
        >
          Add new section
        </Button>
      )}
      <small className="mt-1.5 block text-[11px] text-muted-foreground leading-snug">
        Select a canonical section or add a deliberate new one.
      </small>
    </div>
  );
};

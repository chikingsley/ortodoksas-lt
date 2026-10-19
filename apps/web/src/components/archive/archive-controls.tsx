import { getSectionLabel } from "@ortodoksas-lt/content/sections";
import { SearchIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SiteLocale } from "@/i18n/config";
import { ui } from "@/i18n/ui";

interface ArchiveControlsProps {
  initialLabel?: string;
  initialQuery?: string;
  initialSection?: string;
  initialYear?: string;
  labels: string[];
  locale?: SiteLocale;
  sections: string[];
  years: string[];
}

const allValue = "__all__";

export function ArchiveControls({
  initialLabel = "",
  initialQuery = "",
  initialSection = "",
  initialYear = "",
  labels,
  locale = "lt",
  sections,
  years,
}: ArchiveControlsProps) {
  const labelsForLocale = ui[locale];
  const [label, setLabel] = useState(initialLabel);
  const [query, setQuery] = useState(initialQuery);
  const [section, setSection] = useState(initialSection);
  const [year, setYear] = useState(initialYear);

  const handleLabelChange = useCallback((value: string | null) => {
    setLabel(value ?? "");
  }, []);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.currentTarget.value);
    },
    []
  );

  const handleSectionChange = useCallback((value: string | null) => {
    setSection(value === allValue || value === null ? "" : value);
  }, []);

  const handleYearChange = useCallback((value: string | null) => {
    setYear(value === allValue || value === null ? "" : value);
  }, []);

  const sectionItems = [
    { label: labelsForLocale.archiveAllSections, value: allValue },
    ...sections.map((value) => ({
      label: getSectionLabel(value, locale),
      value,
    })),
  ];

  const yearItems = [
    { label: labelsForLocale.archiveAllYears, value: allValue },
    ...years.map((value) => ({ label: value, value })),
  ];

  return (
    <form
      action="/archyvas"
      className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-center"
      id="archive-controls"
      method="get"
      translate="no"
    >
      <label
        className="lg:max-w-sm lg:min-w-64 lg:flex-1"
        htmlFor="archive-query"
      >
        <span className="sr-only">{labelsForLocale.search}</span>
        <InputGroup>
          <InputGroupInput
            id="archive-query"
            name="q"
            onChange={handleQueryChange}
            placeholder={labelsForLocale.archiveSearchPlaceholder}
            type="search"
            value={query}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </label>

      <Select
        items={sectionItems}
        name="tema"
        onValueChange={handleSectionChange}
        value={section || allValue}
      >
        <SelectTrigger
          aria-label={labelsForLocale.archiveSection}
          className="w-full lg:w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {sectionItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Combobox
        items={labels}
        name="zyma"
        onValueChange={handleLabelChange}
        value={label || null}
      >
        <ComboboxInput
          aria-label={labelsForLocale.archiveLabel}
          className="w-full lg:w-44"
          placeholder={labelsForLocale.archiveLabelPlaceholder}
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>{labelsForLocale.archiveEmptyLabels}</ComboboxEmpty>
          <ComboboxList>
            {labels.map((item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Select
        items={yearItems}
        name="metai"
        onValueChange={handleYearChange}
        value={year || allValue}
      >
        <SelectTrigger
          aria-label={labelsForLocale.archiveYear}
          className="w-full lg:w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {yearItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button className="h-11 md:h-8" type="submit">
        {labelsForLocale.search}
      </Button>
    </form>
  );
}

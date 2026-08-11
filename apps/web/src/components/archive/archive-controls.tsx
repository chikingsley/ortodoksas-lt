import { SearchIcon } from "lucide-react";
import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

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

interface ArchiveControlsProps {
  labels: string[];
  locale?: SiteLocale;
  sections: string[];
  years: string[];
}

const allValue = "__all__";
const filterControlText =
  "font-sans text-base font-normal text-foreground md:text-sm";
const copy: Record<
  SiteLocale,
  {
    allSections: string;
    allYears: string;
    emptyLabels: string;
    label: string;
    labelPlaceholder: string;
    search: string;
    searchPlaceholder: string;
    section: string;
    year: string;
  }
> = {
  be: {
    allSections: "Усе тэмы",
    allYears: "Усе гады",
    emptyLabels: "Меткі не знойдзены",
    label: "Метка",
    labelPlaceholder: "Усе меткі",
    search: "Пошук у архіве",
    searchPlaceholder: "Шукаць па назве або тэме",
    section: "Тэма",
    year: "Год",
  },
  en: {
    allSections: "All topics",
    allYears: "All years",
    emptyLabels: "No tags found",
    label: "Tag",
    labelPlaceholder: "All tags",
    search: "Search the archive",
    searchPlaceholder: "Search by title or topic",
    section: "Section",
    year: "Year",
  },
  lt: {
    allSections: "Visos temos",
    allYears: "Visi metai",
    emptyLabels: "Žymų nerasta",
    label: "Žyma",
    labelPlaceholder: "Visos žymos",
    search: "Ieškoti archyve",
    searchPlaceholder: "Ieškoti pagal pavadinimą ar temą",
    section: "Tema",
    year: "Metai",
  },
  ru: {
    allSections: "Все темы",
    allYears: "Все годы",
    emptyLabels: "Метки не найдены",
    label: "Метка",
    labelPlaceholder: "Все метки",
    search: "Поиск по архиву",
    searchPlaceholder: "Искать по названию или теме",
    section: "Тема",
    year: "Год",
  },
  uk: {
    allSections: "Усі теми",
    allYears: "Усі роки",
    emptyLabels: "Міток не знайдено",
    label: "Мітка",
    labelPlaceholder: "Усі мітки",
    search: "Пошук в архіві",
    searchPlaceholder: "Шукати за назвою або темою",
    section: "Тема",
    year: "Рік",
  },
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase();

interface ArchiveFilterState {
  label: string;
  query: string;
  section: string;
  year: string;
}

const rowMatchesFilters = (
  row: HTMLElement,
  { label, query, section, year }: ArchiveFilterState
) =>
  (!query || row.dataset.search?.includes(query) === true) &&
  (!section || row.dataset.section === section) &&
  (!label || row.dataset.labels?.split("||").includes(label) === true) &&
  (!year || row.dataset.year === year);

export function ArchiveControls({
  labels,
  locale = "lt",
  sections,
  years,
}: ArchiveControlsProps) {
  const displayLocale = locale;
  const labelsForLocale = copy[locale];
  const [hydrated, setHydrated] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");

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
  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
      event.preventDefault();
    },
    []
  );
  const handleYearChange = useCallback((value: string | null) => {
    setYear(value === allValue || value === null ? "" : value);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setSection(params.get("tema") ?? "");
    setLabel(params.get("zyma") ?? "");
    setYear(params.get("metai") ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const filters = {
      label: normalize(label),
      query: normalize(query),
      section,
      year,
    };
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("#archive-list article")
    );
    let visible = 0;

    for (const row of rows) {
      const matches = rowMatchesFilters(row, filters);
      row.hidden = !matches;
      visible += Number(matches);
    }

    const count = document.querySelector("#archive-count");
    if (count) {
      count.textContent = visible.toLocaleString(displayLocale);
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    params.delete("tema");
    params.delete("zyma");
    params.delete("metai");
    if (query) {
      params.set("q", query);
    }
    if (section) {
      params.set("tema", section);
    }
    if (label) {
      params.set("zyma", label);
    }
    if (year) {
      params.set("metai", year);
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size > 0 ? `?${params}` : ""}`
    );
  }, [displayLocale, hydrated, label, query, section, year]);

  const sectionItems = [
    { label: labelsForLocale.allSections, value: allValue },
    ...sections.map((value) => ({ label: value, value })),
  ];
  const yearItems = [
    { label: labelsForLocale.allYears, value: allValue },
    ...years.map((value) => ({ label: value, value })),
  ];

  return (
    <form
      action="/archyvas"
      className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-center"
      id="archive-controls"
      method="get"
      onSubmit={handleSubmit}
      translate="no"
    >
      <label
        className="lg:min-w-64 lg:max-w-sm lg:flex-1"
        htmlFor="archive-query"
      >
        <span className="sr-only">{labelsForLocale.search}</span>
        <InputGroup>
          <InputGroupInput
            id="archive-query"
            name="q"
            onChange={handleQueryChange}
            placeholder={labelsForLocale.searchPlaceholder}
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
        onValueChange={handleSectionChange}
        value={section || allValue}
      >
        <SelectTrigger
          aria-label={labelsForLocale.section}
          className={`w-full lg:w-44 ${filterControlText}`}
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
        onValueChange={handleLabelChange}
        value={label || null}
      >
        <ComboboxInput
          aria-label={labelsForLocale.label}
          className="w-full lg:w-44"
          inputClassName={`${filterControlText} placeholder:text-foreground`}
          placeholder={labelsForLocale.labelPlaceholder}
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>{labelsForLocale.emptyLabels}</ComboboxEmpty>
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
        onValueChange={handleYearChange}
        value={year || allValue}
      >
        <SelectTrigger
          aria-label={labelsForLocale.year}
          className={`w-full lg:w-44 ${filterControlText}`}
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
    </form>
  );
}

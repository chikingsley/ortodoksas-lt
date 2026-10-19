import { useCallback, useEffect, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { CommunityAddressSuggestion } from "@/server/directories/community-geocoding";
import { searchCommunityAddressesQuery } from "@/server/directories/directory.functions";

const SEARCH_DELAY_MS = 350;
const MINIMUM_QUERY_LENGTH = 3;

type SearchStatus = "error" | "idle" | "loading" | "ready";

const suggestionLabel = (suggestion: CommunityAddressSuggestion) =>
  suggestion.label;

const suggestionsMatch = (
  item: CommunityAddressSuggestion,
  value: CommunityAddressSuggestion
) => item.id === value.id;

export function CommunityAddressSearch({
  onSelect,
}: {
  onSelect: (suggestion: CommunityAddressSuggestion) => void;
}) {
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<CommunityAddressSuggestion | null>(
    null
  );

  const [status, setStatus] = useState<SearchStatus>("idle");

  const [suggestions, setSuggestions] = useState<CommunityAddressSuggestion[]>(
    []
  );

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (
      selected?.label === query ||
      normalizedQuery.length < MINIMUM_QUERY_LENGTH
    ) {
      return;
    }

    let active = true;

    const search = async () => {
      try {
        const results = await searchCommunityAddressesQuery({
          data: { query: normalizedQuery },
        });

        if (active) {
          setSuggestions(results);
          setStatus("ready");
        }
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    };

    const timer = window.setTimeout(() => {
      void search();
    }, SEARCH_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, selected?.label]);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setSuggestions([]);
    setStatus(value.trim().length < MINIMUM_QUERY_LENGTH ? "idle" : "loading");
    setSelected((current) => (current?.label === value ? current : null));
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: CommunityAddressSuggestion | null) => {
      if (!suggestion) {
        return;
      }

      setQuery(suggestion.label);
      setSelected(suggestion);
      setStatus("ready");
      setSuggestions([suggestion]);
      onSelect(suggestion);
    },
    [onSelect]
  );

  const emptyMessage = (() => {
    if (status === "loading") {
      return "Searching…";
    }

    if (status === "error") {
      return "Address search paused. Try again.";
    }

    if (query.trim().length < MINIMUM_QUERY_LENGTH) {
      return "Type at least 3 characters.";
    }

    return "Try another address or place name.";
  })();

  return (
    <Field>
      <FieldLabel htmlFor="community-location-search">
        Find address or church
      </FieldLabel>
      <Combobox
        autoComplete="off"
        autoHighlight
        filter={null}
        filteredItems={suggestions}
        inputValue={query}
        isItemEqualToValue={suggestionsMatch}
        items={suggestions}
        itemToStringLabel={suggestionLabel}
        itemToStringValue={suggestionLabel}
        onInputValueChange={updateQuery}
        onValueChange={selectSuggestion}
        value={selected}
      >
        <ComboboxInput
          aria-busy={status === "loading"}
          aria-label="Find address or church"
          className="w-full"
          id="community-location-search"
          placeholder="Search by church name or street address"
          showClear
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(suggestion: CommunityAddressSuggestion) => (
              <ComboboxItem key={suggestion.id} value={suggestion}>
                <span className="min-w-0 truncate">{suggestion.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>
        Choosing a result fills the address fields. Search data ©{" "}
        <a
          className="underline underline-offset-4"
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          OpenStreetMap contributors
        </a>
        , powered by Photon.
      </FieldDescription>
    </Field>
  );
}

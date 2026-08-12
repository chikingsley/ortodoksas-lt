import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface Props {
  action: string;
  buttonLabel: string;
  placeholder: string;
  query?: string;
}

export function SearchForm({
  action,
  buttonLabel,
  placeholder,
  query = "",
}: Props) {
  return (
    <search>
      <form
        action={action}
        className="flex max-w-3xl items-center gap-3 max-sm:items-stretch"
        method="get"
      >
        <label className="min-w-0 flex-1" htmlFor="search-query">
          <span className="sr-only">{buttonLabel}</span>
          <InputGroup className="h-11 rounded-none bg-white">
            <InputGroupAddon className="pl-3">
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              className="text-base"
              defaultValue={query}
              id="search-query"
              name="q"
              placeholder={placeholder}
              type="search"
            />
          </InputGroup>
        </label>
        <Button className="h-11 rounded-none px-5" type="submit">
          {buttonLabel}
        </Button>
      </form>
    </search>
  );
}

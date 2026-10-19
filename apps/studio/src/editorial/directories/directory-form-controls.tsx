import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { siteLocales } from "@ortodoksas-lt/content/site";
import { hasText } from "@ortodoksas-lt/content/value";
import { useCallback, useId } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, Field as ShadcnField } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const localeLabel: Record<SiteLocale, string> = {
  be: "Беларуская",
  en: "English",
  lt: "Lietuvių",
  ru: "Русский",
  uk: "Українська",
};

export const localeOptions = siteLocales.map((locale) => ({
  label: localeLabel[locale],
  value: locale,
}));

export function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: SelectFieldProps<T>) {
  const id = useId();
  const selected = options.find((option) => option.value === value);

  const update = useCallback(
    (nextValue: string | null) => {
      if (hasText(nextValue)) {
        const selectedOption = options.find(
          (option) => option.value === nextValue
        );

        if (selectedOption !== undefined) {
          onChange(selectedOption.value);
        }
      }
    },
    [onChange, options]
  );

  return (
    <ShadcnField>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select onValueChange={update} value={value}>
        <SelectTrigger className="w-full" id={id}>
          <SelectValue>{selected?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ShadcnField>
  );
}

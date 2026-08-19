import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { siteLocales } from "@ortodoksas-lt/content/site";
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

export const Section = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4">{children}</CardContent>
  </Card>
);

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
      if (nextValue) {
        onChange(nextValue as T);
      }
    },
    [onChange]
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

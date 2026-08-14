import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { siteLocales } from "@ortodoksas-lt/content/site";
import { useCallback, useId } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const localeLabel: Record<SiteLocale, string> = {
  be: "Беларуская",
  en: "English",
  lt: "Lietuvių",
  ru: "Русский",
  uk: "Українська",
};

export const Field = ({
  label,
  ...props
}: React.ComponentProps<typeof Input> & { label: string }) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input {...props} id={id} />
    </div>
  );
};

export const TextareaField = ({
  label,
  ...props
}: React.ComponentProps<typeof Textarea> & { label: string }) => {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea {...props} id={id} />
    </div>
  );
};

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

const LocaleTab = ({
  candidate,
  locale,
  onChange,
}: {
  candidate: SiteLocale;
  locale: SiteLocale;
  onChange: (locale: SiteLocale) => void;
}) => {
  const selectLocale = useCallback(
    () => onChange(candidate),
    [candidate, onChange]
  );
  return (
    <Button
      aria-pressed={candidate === locale}
      onClick={selectLocale}
      size="sm"
      type="button"
      variant={candidate === locale ? "default" : "outline"}
    >
      {localeLabel[candidate]}
    </Button>
  );
};

export const LocaleTabs = ({
  locale,
  onChange,
}: {
  locale: SiteLocale;
  onChange: (locale: SiteLocale) => void;
}) => (
  <fieldset
    aria-label="Content language"
    className="flex flex-wrap gap-1 border-0 p-0"
  >
    {siteLocales.map((candidate) => (
      <LocaleTab
        candidate={candidate}
        key={candidate}
        locale={locale}
        onChange={onChange}
      />
    ))}
  </fieldset>
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
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
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
    </div>
  );
}

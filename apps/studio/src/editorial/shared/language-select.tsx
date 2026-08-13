import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languages = [
  { label: "Lithuanian", value: "lt" },
  { label: "English", value: "en" },
  { label: "Russian", value: "ru" },
  { label: "Ukrainian", value: "uk" },
  { label: "Belarusian", value: "be" },
] as const;

interface Props {
  disabled?: boolean;
  id?: string;
  label?: string;
  onChange: (value: string) => void;
  value: string;
}

export function LanguageSelect({
  disabled = false,
  id,
  label = "Article language",
  onChange,
  value,
}: Props) {
  const selectedLanguage = languages.find(
    (language) => language.value === value
  );
  const updateLanguage = useCallback(
    (nextLanguage: string | null) => {
      if (nextLanguage) {
        onChange(nextLanguage);
      }
    },
    [onChange]
  );

  return (
    <Select disabled={disabled} onValueChange={updateLanguage} value={value}>
      <SelectTrigger aria-label={label} className="w-full" id={id}>
        <SelectValue>{selectedLanguage?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

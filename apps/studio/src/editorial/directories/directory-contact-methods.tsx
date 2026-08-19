// biome-ignore-all lint/performance/noJsxPropsBind: Each collection row binds controls to its own index.
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  localeLabel,
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";
import {
  contactKindOptions,
  upsertLocalization,
} from "@/editorial/directories/directory-form-data";

type ContactKind = (typeof contactKindOptions)[number]["value"];

export interface DirectoryContact {
  href: string;
  id?: string;
  kind: ContactKind;
  localizations: { label: string; language: SiteLocale }[];
  sortOrder: number;
}

interface DirectoryContactMethodsProps {
  contacts: DirectoryContact[];
  locale: SiteLocale;
  onChange: (contacts: DirectoryContact[]) => void;
}

export function DirectoryContactMethods({
  contacts,
  locale,
  onChange,
}: DirectoryContactMethodsProps) {
  return (
    <Section title="Contact methods">
      {contacts.map((contact, index) => {
        const translated = contact.localizations.find(
          (item) => item.language === locale
        );
        const rowId = contact.id ?? String(index);
        return (
          <div
            className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_2fr_2fr_auto]"
            key={contact.id ?? index}
          >
            <SelectField
              label="Kind"
              onChange={(kind) =>
                onChange(
                  contacts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, kind } : item
                  )
                )
              }
              options={contactKindOptions}
              value={contact.kind}
            />
            <Field>
              <FieldLabel htmlFor={`contact-${rowId}-url`}>URL</FieldLabel>
              <Input
                id={`contact-${rowId}-url`}
                onChange={(event) =>
                  onChange(
                    contacts.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, href: event.target.value }
                        : item
                    )
                  )
                }
                value={contact.href}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`contact-${rowId}-label`}>
                Label — {localeLabel[locale]}
              </FieldLabel>
              <Input
                id={`contact-${rowId}-label`}
                onChange={(event) =>
                  onChange(
                    contacts.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            localizations: upsertLocalization(
                              item.localizations,
                              locale,
                              () => ({ label: "", language: locale }),
                              (value) => ({
                                ...value,
                                label: event.target.value,
                              })
                            ),
                          }
                        : item
                    )
                  )
                }
                value={translated?.label ?? ""}
              />
            </Field>
            <Button
              aria-label="Remove contact"
              onClick={() =>
                onChange(
                  contacts
                    .filter((_, itemIndex) => itemIndex !== index)
                    .map((item, itemIndex) => ({
                      ...item,
                      sortOrder: itemIndex,
                    }))
                )
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <Button
        onClick={() =>
          onChange([
            ...contacts,
            {
              href: "https://",
              kind: "website",
              localizations: [{ label: "", language: locale }],
              sortOrder: contacts.length,
            },
          ])
        }
        type="button"
        variant="outline"
      >
        <Plus /> Add contact
      </Button>
    </Section>
  );
}

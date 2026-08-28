// biome-ignore-all lint/performance/noJsxPropsBind: Collection controls bind each row to its current index.
import type { CommunityEditorInput } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Section } from "@/editorial/directories/directory-form-controls";
import { upsertLocalization } from "@/editorial/directories/directory-form-data";

type Services = CommunityEditorInput["services"];

interface Props {
  locale: SiteLocale;
  onChange: (services: Services) => void;
  services: Services;
}

export function CommunityServiceFields({ locale, onChange, services }: Props) {
  return (
    <Section title="Service schedule">
      {services.map((service, index) => {
        const translated = service.localizations.find(
          (item) => item.language === locale
        );
        const serviceId = service.id ?? String(index);
        return (
          <div
            className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto]"
            key={service.id ?? index}
          >
            <Field>
              <FieldLabel htmlFor={`service-${serviceId}-${locale}`}>
                Schedule
              </FieldLabel>
              <Input
                id={`service-${serviceId}-${locale}`}
                onChange={(event) =>
                  onChange(
                    services.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            localizations: upsertLocalization(
                              item.localizations,
                              locale,
                              () => ({ language: locale, scheduleText: "" }),
                              (value) => ({
                                ...value,
                                scheduleText: event.target.value,
                              })
                            ),
                          }
                        : item
                    )
                  )
                }
                value={translated?.scheduleText ?? ""}
              />
            </Field>
            <Button
              aria-label="Remove service"
              onClick={() =>
                onChange(services.filter((_, itemIndex) => itemIndex !== index))
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
            ...services,
            {
              endsAt: null,
              localizations: [{ language: locale, scheduleText: "" }],
              sortOrder: services.length,
              startsAt: null,
            },
          ])
        }
        type="button"
        variant="outline"
      >
        <Plus /> Add service time
      </Button>
    </Section>
  );
}

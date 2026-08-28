// biome-ignore-all lint/performance/noJsxPropsBind: Collection controls bind each row to its current index.
import type { PersonEditorInput } from "@ortodoksas-lt/content/directory";
import type { SiteLocale } from "@ortodoksas-lt/content/site";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Section,
  SelectField,
} from "@/editorial/directories/directory-form-controls";
import { upsertLocalization } from "@/editorial/directories/directory-form-data";

type Positions = PersonEditorInput["positions"];

interface Props {
  communityOptions: Array<{ label: string; value: string }>;
  locale: SiteLocale;
  onChange: (positions: Positions) => void;
  positions: Positions;
}

const dateInputValue = (timestamp: number | null) =>
  timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);

const dateTimestamp = (value: string) =>
  value ? Date.parse(`${value}T00:00:00.000Z`) : null;

export function PersonPositionsFields({
  communityOptions,
  locale,
  onChange,
  positions,
}: Props) {
  const replacePosition = (
    index: number,
    update: (position: Positions[number]) => Positions[number]
  ) =>
    onChange(
      positions.map((position, positionIndex) =>
        positionIndex === index ? update(position) : position
      )
    );

  return (
    <Section title="Positions">
      {positions.map((position, index) => {
        const translated = position.localizations.find(
          (item) => item.language === locale
        );
        const updatePositionLocalization = (
          update: (value: { description: string; title: string }) => {
            description: string;
            title: string;
          }
        ) =>
          replacePosition(index, (current) => ({
            ...current,
            localizations: upsertLocalization(
              current.localizations,
              locale,
              () => ({
                description: "",
                language: locale,
                title: "",
              }),
              (value) => ({ ...value, ...update(value) })
            ),
          }));
        const positionId = position.id ?? String(index);
        return (
          <div
            className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0"
            key={position.id ?? index}
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">Position {index + 1}</strong>
              <div className="flex items-center gap-1">
                <Button
                  aria-label="Move position up"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...positions];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    onChange(
                      next.map((item, itemIndex) => ({
                        ...item,
                        sortOrder: itemIndex,
                      }))
                    );
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <ChevronUp />
                </Button>
                <Button
                  aria-label="Move position down"
                  disabled={index === positions.length - 1}
                  onClick={() => {
                    const next = [...positions];
                    [next[index], next[index + 1]] = [
                      next[index + 1],
                      next[index],
                    ];
                    onChange(
                      next.map((item, itemIndex) => ({
                        ...item,
                        sortOrder: itemIndex,
                      }))
                    );
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <ChevronDown />
                </Button>
                <Button
                  aria-label="Remove position"
                  onClick={() =>
                    onChange(
                      positions
                        .filter((_, positionIndex) => positionIndex !== index)
                        .map((item, itemIndex) => ({
                          ...item,
                          sortOrder: itemIndex,
                        }))
                    )
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`position-${positionId}-role`}>
                  Internal role key
                </FieldLabel>
                <Input
                  id={`position-${positionId}-role`}
                  onChange={(event) =>
                    replacePosition(index, (current) => ({
                      ...current,
                      roleKey: event.target.value,
                    }))
                  }
                  value={position.roleKey}
                />
              </Field>
              <SelectField
                label="Assigned community"
                onChange={(communityId) =>
                  replacePosition(index, (current) => ({
                    ...current,
                    communityId:
                      communityId === "unassigned" ? null : communityId,
                  }))
                }
                options={[
                  { label: "Unassigned", value: "unassigned" },
                  ...communityOptions,
                ]}
                value={position.communityId ?? "unassigned"}
              />
            </div>
            <Field>
              <FieldLabel htmlFor={`position-${positionId}-title-${locale}`}>
                Display title
              </FieldLabel>
              <Input
                id={`position-${positionId}-title-${locale}`}
                onChange={(event) =>
                  updatePositionLocalization((value) => ({
                    ...value,
                    title: event.target.value,
                  }))
                }
                value={translated?.title ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor={`position-${positionId}-description-${locale}`}
              >
                Description
              </FieldLabel>
              <Textarea
                id={`position-${positionId}-description-${locale}`}
                onChange={(event) =>
                  updatePositionLocalization((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
                rows={3}
                value={translated?.description ?? ""}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`position-${positionId}-start`}>
                  Start date
                </FieldLabel>
                <Input
                  id={`position-${positionId}-start`}
                  onChange={(event) =>
                    replacePosition(index, (current) => ({
                      ...current,
                      startsAt: dateTimestamp(event.target.value),
                    }))
                  }
                  type="date"
                  value={dateInputValue(position.startsAt)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`position-${positionId}-end`}>
                  End date
                </FieldLabel>
                <Input
                  id={`position-${positionId}-end`}
                  onChange={(event) =>
                    replacePosition(index, (current) => ({
                      ...current,
                      endsAt: dateTimestamp(event.target.value),
                    }))
                  }
                  type="date"
                  value={dateInputValue(position.endsAt)}
                />
              </Field>
            </div>
          </div>
        );
      })}
      <Button
        onClick={() =>
          onChange([
            ...positions,
            {
              communityId: null,
              endsAt: null,
              localizations: [{ description: "", language: locale, title: "" }],
              roleKey: "clergy",
              sortOrder: positions.length,
              startsAt: null,
            },
          ])
        }
        type="button"
        variant="outline"
      >
        <Plus /> Add position
      </Button>
    </Section>
  );
}

// biome-ignore-all lint/performance/noJsxPropsBind: Record lists bind each row to its record identifier.
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TRAILING_S_PATTERN = /s$/u;

export const DirectoryShell = ({
  children,
  onCreate,
  onSelect,
  records,
  selectedId,
  title,
}: {
  children: React.ReactNode;
  onCreate: () => void;
  onSelect: (id: string) => void;
  records: { id: string; label: string }[];
  selectedId: string | null;
  title: string;
}) => {
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const selectRecord = useCallback(
    (id: string) => {
      onSelect(id);
      setMobilePickerOpen(false);
    },
    [onSelect]
  );
  const recordList = (
    <div className="grid gap-1">
      {records.map((record) => (
        <button
          aria-current={record.id === selectedId ? "true" : undefined}
          className={`rounded-md px-3 py-2 text-left text-sm ${record.id === selectedId ? "bg-accent font-medium" : "hover:bg-muted"}`}
          key={record.id}
          onClick={() => selectRecord(record.id)}
          type="button"
        >
          {record.label}
        </button>
      ))}
    </div>
  );
  const selectedLabel =
    records.find((record) => record.id === selectedId)?.label ??
    `New ${title.toLowerCase().replace(TRAILING_S_PATTERN, "")}`;
  return (
    <div className="grid min-h-[calc(100dvh-var(--studio-mobile-header-height))] min-w-0 grid-cols-[224px_minmax(0,1fr)] max-[1000px]:block md:min-h-svh">
      <aside className="sticky top-0 hidden h-svh min-h-0 flex-col border-r bg-muted/25 max-[1000px]:hidden min-[1001px]:flex">
        <div className="flex h-[var(--studio-shell-header-height)] shrink-0 items-center justify-between border-b px-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="data-vertical:h-4 data-vertical:self-auto"
              orientation="vertical"
            />
            <h1 className="m-0 truncate font-semibold text-sm">{title}</h1>
          </div>
          <Button
            aria-label={`Add ${title.toLowerCase()}`}
            onClick={onCreate}
            size="icon-sm"
            type="button"
          >
            <Plus />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{recordList}</div>
      </aside>
      <div className="min-w-0 px-[clamp(16px,3vw,40px)] py-4 sm:py-6 min-[1001px]:py-8">
        <div className="mx-auto mb-3 hidden max-w-6xl items-center justify-between gap-3 max-[1000px]:flex">
          <Sheet onOpenChange={setMobilePickerOpen} open={mobilePickerOpen}>
            <SheetTrigger
              render={
                <Button className="min-w-0 max-w-full" variant="outline" />
              }
            >
              <span className="truncate">{selectedLabel}</span>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>
                  Choose a record to edit or create a new one.
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-4">{recordList}</div>
            </SheetContent>
          </Sheet>
          <Button onClick={onCreate} size="sm" type="button">
            <Plus /> Add
          </Button>
        </div>
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </div>
  );
};

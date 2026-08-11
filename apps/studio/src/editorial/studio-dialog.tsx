import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  popupClassName?: string;
  title: string;
}

export function StudioDialog({
  children,
  description,
  onOpenChange,
  open,
  popupClassName,
  title,
}: Props) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-[rgb(12_21_18/68%)]" />
        <Dialog.Viewport className="fixed inset-0 z-[101] grid place-items-center p-6 max-editor-phone:p-0">
          <Dialog.Popup
            className={cn(
              "grid h-[min(860px,100%)] w-[min(1180px,100%)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[14px] bg-card shadow-[0_24px_70px_rgb(0_0_0/30%)] outline-none max-editor-phone:h-full max-editor-phone:w-full max-editor-phone:rounded-none",
              popupClassName
            )}
          >
            <header className="flex min-h-[62px] items-center justify-between border-b py-2.5 pr-3.5 pl-5">
              <div>
                <Dialog.Title className="block font-bold text-sm">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 block text-[11px] text-muted-foreground">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    aria-label={`Close ${title.toLocaleLowerCase()}`}
                    className="size-9 flex-none [&_svg]:size-[18px]"
                    size="icon-lg"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <X />
              </Dialog.Close>
            </header>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

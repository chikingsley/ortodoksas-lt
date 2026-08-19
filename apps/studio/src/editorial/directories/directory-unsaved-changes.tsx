import { useBlocker } from "@tanstack/react-router";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { StudioDialog } from "@/editorial/shared/studio-dialog";

export function DirectoryUnsavedChanges({ isDirty }: { isDirty: boolean }) {
  const navigationBlocker = useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => isDirty,
    withResolver: true,
  });
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && navigationBlocker.status === "blocked") {
        navigationBlocker.reset();
      }
    },
    [navigationBlocker]
  );
  const discardAndLeave = useCallback(() => {
    if (navigationBlocker.status === "blocked") {
      navigationBlocker.proceed();
    }
  }, [navigationBlocker]);
  const keepEditing = useCallback(() => {
    if (navigationBlocker.status === "blocked") {
      navigationBlocker.reset();
    }
  }, [navigationBlocker]);

  return (
    <StudioDialog
      description="This directory record contains changes that are waiting to be saved."
      onOpenChange={handleOpenChange}
      open={navigationBlocker.status === "blocked"}
      popupClassName="h-auto w-[min(440px,100%)] grid-rows-[auto_auto]"
      title="Leave this record?"
    >
      <div className="grid gap-5 p-5">
        <p className="m-0 text-muted-foreground text-sm leading-6">
          Leaving now discards the current editing session. The latest saved
          record stays available in Studio.
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={keepEditing} type="button" variant="outline">
            Keep editing
          </Button>
          <Button onClick={discardAndLeave} type="button" variant="destructive">
            Discard and leave
          </Button>
        </div>
      </div>
    </StudioDialog>
  );
}

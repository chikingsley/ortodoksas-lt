import { UserButton } from "@clerk/tanstack-react-start";
import { useCallback, useSyncExternalStore } from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { StudioBrand, StudioSidebar } from "@/editorial/shell/studio-sidebar";

interface Props {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "ortodoksas-studio-sidebar-open";

function subscribeSidebar(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("studio-sidebar-change", notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("studio-sidebar-change", notify);
  };
}

function readSidebar() {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
}

function serverSidebar() {
  return true;
}

export function StudioShell({ children }: Props) {
  const sidebarOpen = useSyncExternalStore(
    subscribeSidebar,
    readSidebar,
    serverSidebar
  );

  const changeSidebarOpen = useCallback((open: boolean) => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    window.dispatchEvent(new Event("studio-sidebar-change"));
  }, []);

  return (
    <SidebarProvider
      onOpenChange={changeSidebarOpen}
      open={sidebarOpen}
      style={{
        "--sidebar-width": "224px",
      }}
    >
      <StudioSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="bg-background sticky top-0 z-30 flex h-[var(--studio-mobile-header-height)] items-center gap-2 border-b px-3 md:hidden">
          <SidebarTrigger aria-label="Open Studio navigation" />
          <StudioBrand className="flex-1" logoClassName="w-[124px]" />
          <UserButton />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

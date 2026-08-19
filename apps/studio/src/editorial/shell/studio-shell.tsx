import { UserButton } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useState } from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  StudioBrand,
  StudioSidebar,
  type StudioView,
} from "@/editorial/shell/studio-sidebar";

interface Props {
  activeView: StudioView;
  children: React.ReactNode;
  onNavigate: (view: StudioView) => void;
}

const SIDEBAR_STORAGE_KEY = "ortodoksas-studio-sidebar-open";

export function StudioShell({ activeView, children, onNavigate }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    setSidebarOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false");
  }, []);
  const changeSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  }, []);

  return (
    <SidebarProvider
      onOpenChange={changeSidebarOpen}
      open={sidebarOpen}
      style={
        {
          "--sidebar-width": "224px",
        } as React.CSSProperties
      }
    >
      <StudioSidebar activeView={activeView} onNavigate={onNavigate} />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="sticky top-0 z-30 flex h-[var(--studio-mobile-header-height)] items-center gap-2 border-b bg-background px-3 md:hidden">
          <SidebarTrigger aria-label="Open Studio navigation" />
          <StudioBrand className="flex-1" logoClassName="w-[124px]" />
          <UserButton />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

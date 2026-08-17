import { UserButton } from "@clerk/tanstack-react-start";

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

export function StudioShell({ activeView, children, onNavigate }: Props) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "224px",
        } as React.CSSProperties
      }
    >
      <StudioSidebar activeView={activeView} onNavigate={onNavigate} />
      <SidebarInset className="min-w-0 overflow-hidden">
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

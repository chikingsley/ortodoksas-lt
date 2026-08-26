import { OrganizationProfile } from "@clerk/tanstack-react-start";

import { StudioShell } from "@/editorial/shell/studio-shell";
import { useStudioNavigation } from "@/editorial/shell/use-studio-navigation";

export function TeamWorkspace() {
  const onNavigate = useStudioNavigation({ activeView: "team" });

  return (
    <StudioShell activeView="team" onNavigate={onNavigate}>
      <div className="mx-auto min-h-svh w-full max-w-[1500px] pb-12">
        <header className="flex min-h-[76px] items-center border-b px-[42px] py-3 max-inventory-compact:px-6 max-inventory-mobile:px-4">
          <div>
            <h1 className="m-0 font-[650] text-2xl tracking-[-0.03em]">Team</h1>
            <p className="mt-1 mb-0 text-muted-foreground text-xs">
              Invite staff and manage their Studio access.
            </p>
          </div>
        </header>
        <div className="flex justify-center px-[42px] py-8 max-inventory-compact:px-6 max-inventory-mobile:px-4">
          <OrganizationProfile afterLeaveOrganizationUrl="/access-denied" />
        </div>
      </div>
    </StudioShell>
  );
}

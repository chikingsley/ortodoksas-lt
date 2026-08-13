import { SignOutButton, UserButton } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { StudioBrand } from "@/editorial/shell/studio-sidebar";

export const Route = createFileRoute("/access-denied")({
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <main className="studio-auth-shell grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-[0_18px_60px_rgb(17_17_17/0.08)]">
        <div className="mb-7 flex items-center justify-between gap-4">
          <StudioBrand logoClassName="w-[156px]" />
          <UserButton />
        </div>
        <h1 className="m-0 text-2xl tracking-[-0.025em]">
          Studio access requires an invitation
        </h1>
        <p className="mt-3 mb-7 text-muted-foreground text-sm leading-6">
          This account has a valid sign-in session. An administrator can add its
          Clerk user ID to the Studio allowlist.
        </p>
        <SignOutButton>
          <Button className="w-full" size="lg" variant="outline">
            Sign out
          </Button>
        </SignOutButton>
      </section>
    </main>
  );
}

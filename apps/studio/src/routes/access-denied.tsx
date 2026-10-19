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
      <section className="bg-card w-full max-w-md rounded-xl border p-8 shadow-xl">
        <div className="mb-7 flex items-center justify-between gap-4">
          <StudioBrand logoClassName="w-[156px]" />
          <UserButton />
        </div>
        <h1 className="m-0 text-2xl tracking-tight">
          Studio access requires an invitation
        </h1>
        <p className="text-muted-foreground mt-3 mb-7 text-sm leading-6">
          This account has a valid sign-in session. A Studio administrator can
          invite this email address from the Team screen.
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

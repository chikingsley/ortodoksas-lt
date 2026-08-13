import { Show, SignInButton } from "@clerk/tanstack-react-start";
import { Navigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { StudioBrand } from "@/editorial/shell/studio-sidebar";

export const SignInScreen = () => (
  <>
    <Show when="signed-in">
      <Navigate to="/articles" />
    </Show>
    <Show when="signed-out">
      <main className="studio-auth-shell grid min-h-screen place-items-center px-5 py-12">
        <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-[0_18px_60px_rgb(17_17_17/0.08)] max-inventory-phone:p-6">
          <div className="mb-8">
            <StudioBrand
              className="mb-7"
              logoClassName="w-[178px] max-inventory-phone:w-[156px]"
            />
            <h1 className="m-0 text-2xl tracking-[-0.025em]">
              Editorial Studio
            </h1>
            <p className="mt-3 mb-0 text-muted-foreground text-sm leading-6">
              Sign in to review translations, edit content, and manage the
              publication homepage.
            </p>
          </div>
          <div className="grid gap-3">
            <SignInButton mode="modal">
              <Button className="w-full" size="lg">
                Sign in
              </Button>
            </SignInButton>
          </div>
        </section>
      </main>
    </Show>
  </>
);

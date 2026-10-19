import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function ArticleRouteError({ to }: { to: "/articles" | "/pages" }) {
  return (
    <div className="grid min-h-[calc(100dvh-var(--studio-mobile-header-height))] place-items-center px-4 text-center md:min-h-screen">
      <div className="grid max-w-sm gap-4">
        <div>
          <h1 className="text-lg font-semibold">Content unavailable</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Studio could not load this record. Return to the content list and
            choose another item.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link to={to} />}
          variant="outline"
        >
          Return to content
        </Button>
      </div>
    </div>
  );
}

export const requireStudioWritesOpen = (environment: {
  STUDIO_WRITE_MODE?: string;
}): void => {
  if (environment.STUDIO_WRITE_MODE === "frozen") {
    throw Response.json(
      { error: "Studio writes are paused for release maintenance" },
      { headers: { "retry-after": "300" }, status: 503 }
    );
  }
};

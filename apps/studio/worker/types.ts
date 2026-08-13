export interface EditorIdentity {
  id: string;
  name: string;
  role: "editor";
}

export interface StudioEnvironment {
  Bindings: Env & {
    CLERK_AUTHORIZED_PARTIES?: string;
    CLERK_SECRET_KEY?: string;
    VITE_CLERK_PUBLISHABLE_KEY?: string;
  };
  Variables: {
    editor: EditorIdentity;
  };
}

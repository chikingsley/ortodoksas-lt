export interface EditorIdentity {
  id: string;
  name: string;
  role: "editor";
}

export interface StudioEnvironment {
  Bindings: Env;
  Variables: {
    editor: EditorIdentity;
  };
}

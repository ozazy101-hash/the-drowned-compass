/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_USE_IN_MEMORY_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

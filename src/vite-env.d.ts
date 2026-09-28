/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_AGENT_BASE_URL: string
  readonly VITE_DEV_API_PROXY: string
  readonly VITE_DEV_AGENT_PROXY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

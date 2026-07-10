/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    customer?: {
      email: string
      hasPassword: boolean
    }
  }
}

interface ImportMetaEnv {
  readonly SESSION_SECRET?: string
  readonly CUSTOMER_DATA_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

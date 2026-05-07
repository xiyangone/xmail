/// <reference types="@cloudflare/workers-types" />





declare global {

  interface CloudflareEnv {

    DB: D1Database;

    SITE_CONFIG: KVNamespace;

    TURNSTILE_SECRET_KEY?: string;

    INTERNAL_WORKER_SECRET?: string;

  }



  type Env = CloudflareEnv

}



declare module "next-auth" {

  interface User {

    id?: string

    roles?: { name: string }[]

    permissions?: string[]

    username?: string | null

  }

  

  interface Session {

    user: User

  }

}



export type { Env }


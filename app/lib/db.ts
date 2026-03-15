import { getCloudflareContext } from "@opennextjs/cloudflare"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

export const createDb = async () => {
  const { env } = await getCloudflareContext();
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof drizzle<typeof schema>>

import { PERMISSIONS, Role, ROLES } from "@/lib/permissions";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { EMAIL_CONFIG } from "@/config";
import { checkPermission } from "@/lib/auth";

export const runtime = "edge";

export async function GET() {
  const env = getRequestContext().env;
  const [defaultRole, emailDomains, adminContact, maxEmails, allowRegister, prefixLength, prefixFormat, pollInterval] =
    await Promise.all([
      env.SITE_CONFIG.get("DEFAULT_ROLE"),
      env.SITE_CONFIG.get("EMAIL_DOMAINS"),
      env.SITE_CONFIG.get("ADMIN_CONTACT"),
      env.SITE_CONFIG.get("MAX_EMAILS"),
      env.SITE_CONFIG.get("ALLOW_REGISTER"),
      env.SITE_CONFIG.get("EMAIL_PREFIX_LENGTH"),
      env.SITE_CONFIG.get("EMAIL_PREFIX_FORMAT"),
      env.SITE_CONFIG.get("MESSAGE_POLL_INTERVAL"),
    ]);

  return Response.json({
    defaultRole: defaultRole || ROLES.CIVILIAN,
    emailDomains: emailDomains || "moemail.app",
    adminContact: adminContact || "",
    maxEmails: maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString(),
    allowRegister: allowRegister === "false" ? false : true,
    emailPrefixLength: prefixLength || EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString(),
    emailPrefixFormat: prefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT,
    messagePollInterval: pollInterval || EMAIL_CONFIG.POLL_INTERVAL.toString(),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG);

  if (!canAccess) {
    return Response.json(
      {
        error: "权限不足",
      },
      { status: 403 }
    );
  }

  const { defaultRole, emailDomains, adminContact, maxEmails, allowRegister, emailPrefixLength, emailPrefixFormat, messagePollInterval } =
    (await request.json()) as {
      defaultRole: Exclude<Role, typeof ROLES.EMPEROR>;
      emailDomains: string;
      adminContact: string;
      maxEmails: string;
      allowRegister: boolean;
      emailPrefixLength?: string;
      emailPrefixFormat?: string;
      messagePollInterval?: string;
    };

  if (
    ![ROLES.DUKE, ROLES.KNIGHT, ROLES.CIVILIAN].includes(
      defaultRole as
        | typeof ROLES.DUKE
        | typeof ROLES.KNIGHT
        | typeof ROLES.CIVILIAN
    )
  ) {
    return Response.json({ error: "无效的角色" }, { status: 400 });
  }

  const env = getRequestContext().env;
  const promises = [
    env.SITE_CONFIG.put("DEFAULT_ROLE", defaultRole),
    env.SITE_CONFIG.put("EMAIL_DOMAINS", emailDomains),
    env.SITE_CONFIG.put("ADMIN_CONTACT", adminContact),
    env.SITE_CONFIG.put("MAX_EMAILS", maxEmails),
    env.SITE_CONFIG.put("ALLOW_REGISTER", String(allowRegister)),
  ];

  // 添加前缀配置（如果提供）
  if (emailPrefixLength !== undefined) {
    promises.push(env.SITE_CONFIG.put("EMAIL_PREFIX_LENGTH", emailPrefixLength));
  }
  if (emailPrefixFormat !== undefined) {
    promises.push(env.SITE_CONFIG.put("EMAIL_PREFIX_FORMAT", emailPrefixFormat));
  }
  if (messagePollInterval !== undefined) {
    promises.push(env.SITE_CONFIG.put("MESSAGE_POLL_INTERVAL", messagePollInterval));
  }

  await Promise.all(promises);

  return Response.json({ success: true });
}

"use client";

import { create } from "zustand";
import { Role, ROLES } from "@/lib/permissions";
import { EMAIL_CONFIG } from "@/config";
import { useEffect } from "react";

interface Config {
  defaultRole: Exclude<Role, typeof ROLES.EMPEROR>;
  emailDomains: string;
  emailDomainsArray: string[];
  adminContact: string;
  maxEmails: number;
  messagePollInterval?: string;
}

interface ConfigStore {
  config: Config | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

/**
 * 提取域名的后缀部分
 * 例如: "xiyang.ggff.net" -> "ggff.net" (二级域名)
 *       "xiyangone.cn" -> "cn" (顶级域名)
 */
function getDomainSuffix(domain: string): string {
  const parts = domain.split(".");
  // 如果只有两部分 (如 example.com),返回最后一部分 (顶级域名)
  // 如果有三部分或更多 (如 sub.example.com),返回最后两部分 (二级域名)
  if (parts.length <= 2) {
    return parts[parts.length - 1] || domain;
  }
  return parts.slice(-2).join(".");
}

/**
 * 判断域名后缀是否为顶级域名 (TLD)
 * 顶级域名: 只有一个点分隔符,如 "cn", "com", "net", "org", "online"
 * 二级域名: 有两个点分隔符,如 "ggff.net", "netlib.re", "dpdns.org"
 */
function isTopLevelDomain(suffix: string): boolean {
  return !suffix.includes(".");
}

/**
 * 域名排序函数
 * 排序规则:
 * 1. 顶级域名 (如 .cn, .online) 优先于二级域名 (如 .ggff.net, .netlib.re)
 * 2. 同级别内按字母顺序排序 (cn < online, ggff.net < netlib.re)
 * 3. 同组内按完整域名长度升序 (短域名优先)
 * 4. 相同长度按字母顺序
 */
function sortDomains(domains: string[]): string[] {
  return [...domains].sort((a, b) => {
    const suffixA = getDomainSuffix(a);
    const suffixB = getDomainSuffix(b);
    const isTldA = isTopLevelDomain(suffixA);
    const isTldB = isTopLevelDomain(suffixB);

    // 1. 顶级域名优先于二级域名
    if (isTldA !== isTldB) {
      return isTldA ? -1 : 1; // 顶级域名 (-1) 排在前面
    }

    // 2. 同级别内,先按后缀字母顺序分组
    if (suffixA !== suffixB) {
      return suffixA.localeCompare(suffixB);
    }

    // 3. 同组内按完整域名长度排序
    if (a.length !== b.length) {
      return a.length - b.length;
    }

    // 4. 长度相同按字母顺序
    return a.localeCompare(b);
  });
}

const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loading: false,
  error: null,
  fetch: async () => {
    try {
      set({ loading: true, error: null });
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("获取配置失败");
      const data = (await res.json()) as Config & {
        messagePollInterval?: string;
      };

      // 解析并排序域名数组
      const domainsArray = data.emailDomains
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      const sortedDomains = sortDomains(domainsArray);

      set({
        config: {
          defaultRole: data.defaultRole || ROLES.CIVILIAN,
          emailDomains: data.emailDomains,
          emailDomainsArray: sortedDomains,
          adminContact: data.adminContact || "",
          maxEmails: Number(data.maxEmails) || EMAIL_CONFIG.MAX_ACTIVE_EMAILS,
          messagePollInterval: data.messagePollInterval,
        },
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "获取配置失败",
        loading: false,
      });
    }
  },
}));

export function useConfig() {
  const store = useConfigStore();

  useEffect(() => {
    if (!store.config && !store.loading) {
      store.fetch();
    }
  }, [store]);

  return store;
}

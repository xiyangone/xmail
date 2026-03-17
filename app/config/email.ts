export const EMAIL_PREFIX_FORMATS = {
  RANDOM: 'random', // 纯随机字符串（默认，字母+数字）
  RANDOM_ALPHA: 'random_alpha', // 纯随机字母（无数字）
  NAME_NUMBER: 'name_number', // 名字+随机数字
  NAME_DATE: 'name_date', // 名字+随机日期MMDD
  NAME_YEAR: 'name_year', // 名字+随机年份YYYY
  RANDOM_DATE: 'random_date', // 随机字符串+日期MMDD
  RANDOM_YEAR: 'random_year', // 随机字符串+年份YYYY
} as const

export type EmailPrefixFormat = typeof EMAIL_PREFIX_FORMATS[keyof typeof EMAIL_PREFIX_FORMATS]

export const EMAIL_CONFIG = {
  DEFAULT_EMAIL_DOMAIN: "mail.xiyangone.cn",
  MAX_ACTIVE_EMAILS: 30, // Maximum number of active emails
  POLL_INTERVAL: 15_000, // Polling interval in milliseconds (15 seconds)
  DEFAULT_DAILY_SEND_LIMITS: {
    emperor: 0,   // 皇帝无限制
    duke: 5,      // 公爵每日5封
    knight: 2,    // 骑士每日2封
    civilian: -1, // 平民禁止发件
  },
  DEFAULT_PREFIX_LENGTH: 8, // 默认前缀长度
  DEFAULT_PREFIX_FORMAT: EMAIL_PREFIX_FORMATS.RANDOM, // 默认前缀格式
} as const

export type EmailConfig = typeof EMAIL_CONFIG 

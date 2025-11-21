/**
 * 验证码提取工具
 * 从邮件内容中提取验证码
 */

/**
 * 验证码模式定义 (按优先级排序)
 * 参考常见邮件验证码格式优化
 */
const VERIFICATION_CODE_PATTERNS = [
  // 1. "Your verification code is: 672246" (最常见的英文格式)
  /verification\s+code\s+is[:\s]+([0-9]{4,8})/i,

  // 2. "验证码: 123456" 或 "验证码：123456"
  /验证码[:\s：]+([0-9]{4,8})/i,

  // 3. "code is: 123456" 或 "code: 123456"
  /\bcode\s+is[:\s]+([0-9]{4,8})/i,
  /\bcode[:\s]+([0-9]{4,8})/i,

  // 4. "OTP: 123456" 或 "PIN: 123456"
  /\b(?:otp|pin)[:\s]+([0-9]{4,8})/i,

  // 5. "您的验证码是: 123456"
  /您的验证码(?:是|为)[:\s：]*([0-9]{4,8})/i,

  // 6. "123456 是您的验证码"
  /([0-9]{4,8})\s*(?:是|为)(?:您的)?验证码/i,

  // 7. HTML 标签中的验证码 (h1-h6, b, strong)
  /<(?:h[1-6]|b|strong)[^>]*>\s*([0-9]{4,8})\s*<\/(?:h[1-6]|b|strong)>/i,

  // 8. 大字体或特殊样式的验证码 (包括 div 标签)
  /<(?:div|span|p)[^>]*(?:font-size|font-weight|style)[^>]*>\s*([0-9]{4,8})\s*<\/(?:div|span|p)>/i,

  // 8.5. 任意 div/span/p 标签包裹的纯数字（较宽松，用于处理复杂属性）
  /<(?:div|span|p)[^>]*>\s*([0-9]{6})\s*<\/(?:div|span|p)>/i,

  // 9. 6位纯数字 (最常见的验证码长度)
  /\b([0-9]{6})\b/,

  // 10. 4-5位纯数字
  /\b([0-9]{4,5})\b/,
];

/**
 * 从文本中提取验证码
 */
export function extractVerificationCode(text: string): string | null {
  if (!text) return null;

  // 移除多余的空白字符,但保留单个空格
  const cleanText = text.replace(/\s+/g, " ").trim();

  // 按优先级尝试所有模式
  for (let i = 0; i < VERIFICATION_CODE_PATTERNS.length; i++) {
    const pattern = VERIFICATION_CODE_PATTERNS[i];
    const match = cleanText.match(pattern);

    if (match && match[1]) {
      const code = match[1].trim();

      // 验证码长度必须在 4-8 位之间
      if (code.length >= 4 && code.length <= 8) {
        // 前9个模式优先级高,直接返回（包括HTML标签相关模式）
        if (i < 9) {
          return code;
        }

        // 后面的纯数字模式需要额外验证
        // 检查是否在验证码相关的上下文中
        if (hasVerificationContext(cleanText, code)) {
          return code;
        }
      }
    }
  }

  return null;
}

/**
 * 检查数字是否在验证码相关的上下文中
 */
function hasVerificationContext(text: string, code: string): boolean {
  const lowerText = text.toLowerCase();

  // 验证码相关关键词
  const keywords = [
    "verification",
    "verify",
    "code",
    "otp",
    "pin",
    "验证码",
    "动态码",
    "校验码",
  ];

  // 检查是否包含关键词
  const hasKeyword = keywords.some((keyword) => lowerText.includes(keyword));

  if (!hasKeyword) return false;

  // 查找验证码在文本中的位置
  const codeIndex = text.indexOf(code);
  if (codeIndex === -1) return false;

  // 获取验证码前后的上下文 (前后各50个字符)
  const contextStart = Math.max(0, codeIndex - 50);
  const contextEnd = Math.min(text.length, codeIndex + code.length + 50);
  const context = text.substring(contextStart, contextEnd).toLowerCase();

  // 检查上下文中是否包含验证码关键词
  return keywords.some((keyword) => context.includes(keyword));
}

/**
 * 从邮件对象中提取验证码
 */
export function extractVerificationCodeFromMessage(message: {
  subject?: string;
  content?: string;
  html?: string;
}): string | null {
  // 1. 优先从 HTML 内容中提取 (通常格式最完整)
  if (message.html) {
    const code = extractVerificationCode(message.html);
    if (code) return code;
  }

  // 2. 其次从纯文本内容中提取
  if (message.content) {
    const code = extractVerificationCode(message.content);
    if (code) return code;
  }

  // 3. 最后从主题中提取
  if (message.subject) {
    const code = extractVerificationCode(message.subject);
    if (code) return code;
  }

  return null;
}

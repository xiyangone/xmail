import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// PBKDF2 密码哈希（每用户独立随机盐）
// 存储格式: "pbkdf2$<iterations>$<base64Salt>$<base64Hash>"
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const HASH_LENGTH = 32

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_LENGTH * 8
  )
  const saltB64 = btoa(String.fromCharCode(...salt))
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltB64}$${hashB64}`
}

export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  // 兼容旧格式（纯 SHA-256 base64）：不含 "$" 分隔符
  if (!storedHash.startsWith("pbkdf2$")) {
    return await compareLegacyPassword(password, storedHash)
  }

  const parts = storedHash.split("$")
  if (parts.length !== 4) return false

  const iterations = parseInt(parts[1])
  const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0))
  const expectedHash = parts[3]

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_LENGTH * 8
  )
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return hashB64 === expectedHash
}

// 旧格式兼容：SHA-256 + AUTH_SECRET 静态盐
async function compareLegacyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const salt = process.env.AUTH_SECRET || ''
  const data = encoder.encode(password + salt)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return hashB64 === storedHash
}

// 检查密码是否为旧格式，需要 rehash
export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith("pbkdf2$")
}

// 通用 SHA-256 哈希（用于 API Key 等高熵值场景，不需要 PBKDF2）
export async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}
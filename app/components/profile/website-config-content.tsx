"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { Role, ROLES } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EMAIL_CONFIG, EMAIL_PREFIX_FORMATS } from "@/config"
import { DomainEditor } from "./domain-editor"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function WebsiteConfigContent() {
  const [defaultRole, setDefaultRole] = useState<string>("")
  const [emailDomains, setEmailDomains] = useState<string>("")
  const [adminContact, setAdminContact] = useState<string>("")
  const [maxEmails, setMaxEmails] = useState<string>(EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString())
  const [allowRegister, setAllowRegister] = useState<boolean>(true)
  const [emailPrefixLength, setEmailPrefixLength] = useState<string>(EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString())
  const [emailPrefixFormat, setEmailPrefixFormat] = useState<string>(EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT)
  const [messagePollInterval, setMessagePollInterval] = useState<string>(EMAIL_CONFIG.POLL_INTERVAL.toString())
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    const res = await fetch("/api/config")
    if (res.ok) {
      const data = await res.json() as { 
        defaultRole: Exclude<Role, typeof ROLES.EMPEROR>,
        emailDomains: string,
        adminContact: string,
        maxEmails: string,
        allowRegister: boolean,
        emailPrefixLength: string,
        emailPrefixFormat: string,
        messagePollInterval: string
      }
      setDefaultRole(data.defaultRole)
      setEmailDomains(data.emailDomains)
      setAdminContact(data.adminContact)
      setMaxEmails(data.maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString())
      setAllowRegister(data.allowRegister ?? true)
      setEmailPrefixLength(data.emailPrefixLength || EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString())
      setEmailPrefixFormat(data.emailPrefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT)
      setMessagePollInterval(data.messagePollInterval || EMAIL_CONFIG.POLL_INTERVAL.toString())
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          defaultRole, 
          emailDomains,
          adminContact,
          maxEmails: maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString(),
          allowRegister,
          emailPrefixLength,
          emailPrefixFormat,
          messagePollInterval
        }),
      })

      if (!res.ok) {
        const errorData = await res.json() as { error?: string }
        throw new Error(errorData.error || "保存失败")
      }

      toast({
        title: "保存成功",
        description: "网站设置已更新",
      })
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="allow-register" className="text-sm font-medium">
            允许新用户注册
          </Label>
          <p className="text-xs text-muted-foreground">
            关闭后，/api/auth/register 将拒绝新注册
          </p>
        </div>
        <Switch
          id="allow-register"
          checked={allowRegister}
          onCheckedChange={setAllowRegister}
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">新用户默认角色:</span>
        <Select value={defaultRole} onValueChange={setDefaultRole}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLES.DUKE}>公爵</SelectItem>
            <SelectItem value={ROLES.KNIGHT}>骑士</SelectItem>
            <SelectItem value={ROLES.CIVILIAN}>平民</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">邮箱域名:</span>
        <DomainEditor 
          value={emailDomains}
          onChange={setEmailDomains}
          placeholder="输入域名，如: moemail.app"
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">管理员联系方式:</span>
        <div className="flex-1">
          <Input 
            value={adminContact}
            onChange={(e) => setAdminContact(e.target.value)}
            placeholder="如: 微信号、邮箱等"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">最大邮箱数量:</span>
        <div className="flex-1">
          <Input 
            type="number"
            min="1"
            max="100"
            value={maxEmails}
            onChange={(e) => setMaxEmails(e.target.value)}
            placeholder={`默认为 ${EMAIL_CONFIG.MAX_ACTIVE_EMAILS}`}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm font-medium">消息自动刷新配置</Label>
          <p className="text-xs text-muted-foreground">
            设置邮件列表的自动刷新间隔时间（毫秒）
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">刷新间隔:</span>
          <div className="flex-1 flex items-center gap-2">
            <Input 
              type="number"
              min="3000"
              max="60000"
              step="1000"
              value={messagePollInterval}
              onChange={(e) => setMessagePollInterval(e.target.value)}
              placeholder={`默认为 ${EMAIL_CONFIG.POLL_INTERVAL} 毫秒`}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              ({(parseInt(messagePollInterval) / 1000).toFixed(0)} 秒)
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>建议值：</strong>
          <ul className="mt-1 space-y-1 ml-4 list-disc">
            <li>5000 (5秒) - 快速刷新，适合需要实时接收邮件的场景</li>
            <li>15000 (15秒) - 平衡选择，默认值</li>
            <li>30000 (30秒) - 降低服务器负载</li>
          </ul>
          <p className="mt-2 text-yellow-600 dark:text-yellow-500">
            ⚠️ 刷新间隔过短可能会增加服务器负载，建议设置在 5-30 秒之间
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm font-medium">邮箱前缀生成配置</Label>
          <p className="text-xs text-muted-foreground">
            用户不输入前缀时，系统将根据以下配置自动生成
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">前缀长度:</span>
          <div className="flex-1">
            <Input 
              type="number"
              min="4"
              max="20"
              value={emailPrefixLength}
              onChange={(e) => setEmailPrefixLength(e.target.value)}
              placeholder={`默认为 ${EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH} 位`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">生成格式:</span>
          <div className="flex-1">
            <Select value={emailPrefixFormat} onValueChange={setEmailPrefixFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM}>
                  随机字符串（字母+数字）
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_NUMBER}>
                  名字+随机数字
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_DATE}>
                  名字+日期（MMDD）
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_YEAR}>
                  名字+年份（YYYY）
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_DATE}>
                  随机字符串+日期（MMDD）
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_YEAR}>
                  随机字符串+年份（YYYY）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>格式说明：</strong>
          <ul className="mt-1 space-y-1 ml-4 list-disc">
            <li>随机字符串：如 Rx4Tn2kP（默认）</li>
            <li>名字+随机数字：如 james123、emma4567</li>
            <li>名字+日期：如 john0524、mary1208</li>
            <li>名字+年份：如 david1995、sarah2001</li>
            <li>随机字符串+日期：如 abc0524、xyz1208</li>
            <li>随机字符串+年份：如 xyz1995、abc2001</li>
          </ul>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button 
          variant="outline"
          onClick={() => router.push("/admin/settings/cleanup")}
          className="w-full gap-2"
        >
          <Settings className="w-4 h-4" />
          清理与到期策略
        </Button>
      </div>

      <Button 
        onClick={handleSave}
        disabled={loading}
        className="w-full"
      >
        保存
      </Button>
    </div>
  )
}

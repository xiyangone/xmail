"use client"

import { useState, useEffect, KeyboardEvent, useRef } from "react"
import { X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DomainEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DomainEditor({ value, onChange, placeholder }: DomainEditorProps) {
  const [domains, setDomains] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [showInput, setShowInput] = useState(false)
  const isUpdatingRef = useRef(false)

  // 初始化域名列表
  useEffect(() => {
    // 如果正在更新中，跳过这次effect，避免覆盖本地状态
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false
      return
    }

    if (value) {
      const domainList = value.split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0)
      setDomains(domainList)
    } else {
      setDomains([])
    }
  }, [value])

  // 添加域名
  const addDomain = () => {
    const newDomain = inputValue.trim().toLowerCase()
    
    // 验证域名格式 - 支持多级子域名、连字符和带数字的顶级域名
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z0-9]{2,}$/i
    
    if (newDomain && domainRegex.test(newDomain)) {
      if (!domains.includes(newDomain)) {
        const updatedDomains = [...domains, newDomain]
        setDomains(updatedDomains)
        isUpdatingRef.current = true
        onChange(updatedDomains.join(','))
      }
      setInputValue("")
      setShowInput(false)
    }
  }

  // 移除域名
  const removeDomain = (domainToRemove: string) => {
    const updatedDomains = domains.filter(d => d !== domainToRemove)
    setDomains(updatedDomains)
    isUpdatingRef.current = true  // 标记正在更新，避免useEffect覆盖
    onChange(updatedDomains.join(','))
  }

  // 处理键盘事件
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addDomain()
    } else if (e.key === 'Escape') {
      setShowInput(false)
      setInputValue("")
    }
  }

  // 批量添加域名（支持粘贴多个域名）
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    
    const pastedDomains = pastedText
      .split(/[,\s\n]+/)
      .map(d => d.trim().toLowerCase())
      .filter(d => {
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z0-9]{2,}$/i
        return d && domainRegex.test(d) && !domains.includes(d)
      })
    
    if (pastedDomains.length > 0) {
      const updatedDomains = [...domains, ...pastedDomains]
      setDomains(updatedDomains)
      isUpdatingRef.current = true
      onChange(updatedDomains.join(','))
      setInputValue("")
      setShowInput(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* 域名标签显示区域 - 响应式高度，根据域名数量自动调整 */}
      {domains.length > 0 && (
        <div className="w-full rounded-md border p-3 flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {domains.map((domain) => (
              <Badge 
                key={domain} 
                variant="secondary" 
                className="px-2 py-1 text-sm font-normal"
              >
                <span className="mr-1">{domain}</span>
                <button
                  onClick={() => removeDomain(domain)}
                  className="ml-1 hover:text-destructive transition-colors"
                  aria-label={`移除 ${domain}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}

      {/* 添加域名输入区 */}
      <div className="flex gap-2">
        {showInput ? (
          <>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              placeholder={placeholder || "输入域名，如: example.com"}
              className="flex-1"
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addDomain}
              disabled={!inputValue.trim()}
            >
              添加
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowInput(false)
                setInputValue("")
              }}
            >
              取消
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInput(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加域名
          </Button>
        )}
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-muted-foreground">
        {domains.length === 0 
          ? "点击添加域名，支持批量粘贴多个域名" 
          : `已添加 ${domains.length} 个域名，点击标签上的 × 可以删除`}
      </p>
    </div>
  )
}
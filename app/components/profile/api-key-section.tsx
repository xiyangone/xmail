"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, Plus, Loader2, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useCopy } from "@/hooks/use-copy"
import { useRolePermission } from "@/hooks/use-role-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { CollapsibleSection } from "./collapsible-section"
import { ApiKeyPanelContent } from "./api-key-panel-content"

export function ApiKeySection() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()
  const { copyToClipboard } = useCopy()
  const { checkPermission } = useRolePermission()
  const canManageApiKey = checkPermission(PERMISSIONS.MANAGE_API_KEY)

  const createApiKey = async () => {
    if (!newKeyName.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      })

      if (!res.ok) throw new Error("创建 API Key 失败")

      const data = await res.json() as { key: string }
      setNewKey(data.key)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive"
      })
      setCreateDialogOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogClose = () => {
    setCreateDialogOpen(false)
    setNewKeyName("")
    setNewKey(null)
  }

  const createButton = canManageApiKey ? (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          className="gap-2 bg-orange-500 hover:bg-orange-600 dark:bg-purple-600 dark:hover:bg-purple-700"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          创建 API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {newKey ? "API Key 创建成功" : "创建新的 API Key"}
          </DialogTitle>
          {newKey && (
            <DialogDescription className="text-destructive">
              请立即保存此密钥，它只会显示一次且无法恢复
            </DialogDescription>
          )}
        </DialogHeader>

        {!newKey ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="为你的 API Key 起个名字"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={newKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={handleDialogClose}
              disabled={loading}
            >
              {newKey ? "完成" : "取消"}
            </Button>
          </DialogClose>
          {!newKey && (
            <Button
              onClick={createApiKey}
              disabled={loading || !newKeyName.trim()}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "创建"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null

  return (
    <CollapsibleSection 
      title="API Keys" 
      icon={Key} 
      storageKey="profile-api-keys-open"
      action={createButton}
    >
      <ApiKeyPanelContent key={refreshTrigger} />
    </CollapsibleSection>
  )
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPIRY_OPTIONS } from "@/types/email";
import { useCopy } from "@/hooks/use-copy";
import { useConfig } from "@/hooks/use-config";

interface CreateDialogProps {
  onEmailCreated: () => void;
}

export function CreateDialog({ onEmailCreated }: CreateDialogProps) {
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [currentDomain, setCurrentDomain] = useState("");
  const [expiryTime, setExpiryTime] = useState(
    EXPIRY_OPTIONS[2].value.toString()
  );
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();
  const emailNameInputRef = useRef<HTMLInputElement>(null);

  // 对话框打开时自动聚焦到邮箱名输入框
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        emailNameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const generateRandomName = async () => {
    try {
      const response = await fetch("/api/emails/preview-prefix");
      if (response.ok) {
        const data = (await response.json()) as { prefix: string };
        setEmailName(data.prefix);
      }
    } catch (error) {
      console.error("Failed to generate prefix:", error);
      // 如果失败，清空让后端在创建时生成
      setEmailName("");
    }
  };

  const copyEmailAddress = () => {
    copyToClipboard(`${emailName}@${currentDomain}`);
  };

  const createEmail = async () => {
    // 允许空前缀，由后端根据配置生成

    setLoading(true);
    try {
      const response = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emailName,
          domain: currentDomain,
          expiryTime: parseInt(expiryTime),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "错误",
          description: (data as { error: string }).error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "成功",
        description: "已创建新的临时邮箱",
      });
      onEmailCreated();
      setOpen(false);
      setEmailName("");
    } catch {
      toast({
        title: "错误",
        description: "创建邮箱失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((config?.emailDomainsArray?.length ?? 0) > 0) {
      setCurrentDomain(config?.emailDomainsArray[0] ?? "");
    }
  }, [config]);

  // 鼠标滚轮切换域名 - 优化版本,鼠标悬停在域名选择器区域即可切换
  const handleDomainWheel = (e: React.WheelEvent) => {
    if (!config?.emailDomainsArray || config.emailDomainsArray.length <= 1) return;

    e.preventDefault();
    e.stopPropagation();

    const currentIndex = config.emailDomainsArray.indexOf(currentDomain);
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (e.deltaY > 0) {
      // 向下滚动 - 下一个域名
      nextIndex = (currentIndex + 1) % config.emailDomainsArray.length;
    } else {
      // 向上滚动 - 上一个域名
      nextIndex = (currentIndex - 1 + config.emailDomainsArray.length) % config.emailDomainsArray.length;
    }

    setCurrentDomain(config.emailDomainsArray[nextIndex]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          创建新邮箱
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新的临时邮箱</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              ref={emailNameInputRef}
              value={emailName}
              onChange={(e) => setEmailName(e.target.value)}
              placeholder="输入邮箱名"
              className="flex-1"
            />
            {(config?.emailDomainsArray?.length ?? 0) > 1 && (
              <div
                onWheel={handleDomainWheel}
                className="relative group"
                title="鼠标滚轮可快速切换域名"
              >
                <Select value={currentDomain} onValueChange={setCurrentDomain}>
                  <SelectTrigger className="w-[180px] transition-all group-hover:ring-2 group-hover:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config?.emailDomainsArray?.map((d) => (
                      <SelectItem key={d} value={d}>
                        @{d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={generateRandomName}
              type="button"
              title="根据配置生成前缀"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Label className="shrink-0 text-muted-foreground">过期时间</Label>
            <RadioGroup
              value={expiryTime}
              onValueChange={setExpiryTime}
              className="flex gap-6"
            >
              {EXPIRY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value.toString()}
                    id={option.value.toString()}
                  />
                  <Label
                    htmlFor={option.value.toString()}
                    className="cursor-pointer text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">完整邮箱地址将为:</span>
            {emailName ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{`${emailName}@${currentDomain}`}</span>
                <div
                  className="shrink-0 cursor-pointer hover:text-primary transition-colors"
                  onClick={copyEmailAddress}
                >
                  <Copy className="size-4" />
                </div>
              </div>
            ) : (
              <span className="text-gray-400">...</span>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={createEmail} disabled={loading}>
            {loading ? "创建中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

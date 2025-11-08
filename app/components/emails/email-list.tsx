"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useSession } from "next-auth/react";
import { CreateDialog } from "./create-dialog";
import { Mail, RefreshCw, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThrottle } from "@/hooks/use-throttle";
import { EMAIL_CONFIG } from "@/config";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ROLES } from "@/lib/permissions";
import { useUserRole } from "@/hooks/use-user-role";
import { useConfig } from "@/hooks/use-config";
import { EmailListSkeleton } from "@/components/ui/loading-skeletons";
import { EmptyState } from "@/components/ui/empty-state";

interface Email {
  id: string;
  address: string;
  createdAt: number;
  expiresAt: number;
}

interface EmailListProps {
  onEmailSelect: (email: Email | null) => void;
  selectedEmailId?: string;
}

interface EmailResponse {
  emails: Email[];
  nextCursor: string | null;
  total: number;
}

// 优化的邮箱列表项组件
const EmailItem = memo(function EmailItem({
  email,
  index,
  isSelected,
  isChecked,
  onSelect,
  onDelete,
  onToggleCheck,
}: {
  email: Email;
  index: number;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (email: Email) => void;
  onDelete: (email: Email) => void;
  onToggleCheck: (emailId: string) => void;
}) {
  const { isExpiringSoon, isPermanent, formattedExpiry } = useMemo(() => {
    const expiryTime = new Date(email.expiresAt).getTime();
    const now = Date.now();
    const isPerm = new Date(email.expiresAt).getFullYear() === 9999;
    const isExpiring = expiryTime - now < 24 * 60 * 60 * 1000 && !isPerm;
    const formatted = isPerm
      ? ""
      : new Date(email.expiresAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
    return {
      isExpiringSoon: isExpiring,
      isPermanent: isPerm,
      formattedExpiry: formatted,
    };
  }, [email.expiresAt]);

  const handleClick = useCallback(() => {
    onSelect(email);
  }, [email, onSelect]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(email);
    },
    [email, onDelete]
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCheck(email.id);
    },
    [email.id, onToggleCheck]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg cursor-pointer text-sm group transition-all duration-200",
        "hover:bg-primary/10 hover:shadow-md hover:scale-[1.02]",
        "border border-transparent hover:border-primary/20",
        isSelected && "bg-primary/15 border-primary/30 shadow-md",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={handleClick}
    >
      <button onClick={handleCheckboxClick} className="flex-shrink-0">
        {isChecked ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
      <Mail className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors flex-shrink-0" />
      <div className="truncate flex-1 space-y-1">
        <div className="font-medium truncate group-hover:text-primary transition-colors">
          {email.address}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {isPermanent ? (
            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
              永久有效
            </span>
          ) : (
            <>
              {isExpiringSoon && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium animate-pulse">
                  即将过期
                </span>
              )}
              <span>过期: {formattedExpiry}</span>
            </>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-8 w-8 transition-opacity"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
});

export function EmailList({ onEmailSelect, selectedEmailId }: EmailListProps) {
  const { data: session } = useSession();
  const { config } = useConfig();
  const { role } = useUserRole();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [emailToDelete, setEmailToDelete] = useState<Email | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const isTempUser = role === ROLES.TEMP_USER;
  const canCreateEmail = !isTempUser;

  const fetchEmails = useCallback(
    async (cursor?: string) => {
      try {
        const url = new URL("/api/emails", window.location.origin);
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }
        const response = await fetch(url);
        const data = (await response.json()) as EmailResponse;

        if (!cursor) {
          const newEmails = data.emails;
          const oldEmails = emails;

          // 创建新邮件的 ID 集合,用于快速查找
          const newEmailIds = new Set(newEmails.map((e) => e.id));

          // 过滤掉已被删除的旧邮件(服务器返回的新数据中不存在的)
          const validOldEmails = oldEmails.filter((e) => newEmailIds.has(e.id));

          const lastDuplicateIndex = newEmails.findIndex((newEmail) =>
            validOldEmails.some((oldEmail) => oldEmail.id === newEmail.id)
          );

          if (lastDuplicateIndex === -1) {
            setEmails(newEmails);
            setNextCursor(data.nextCursor);
            setTotal(newEmails.length);
            return;
          }
          const uniqueNewEmails = newEmails.slice(0, lastDuplicateIndex);
          const updatedEmails = [...uniqueNewEmails, ...validOldEmails];
          setEmails(updatedEmails);
          setTotal(updatedEmails.length);
          return;
        }
        setEmails((prev) => {
          const updated = [...prev, ...data.emails];
          setTotal(updated.length);
          return updated;
        });
        setNextCursor(data.nextCursor);
      } catch (error) {
        console.error("Failed to fetch emails:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [emails]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmails();
  }, [fetchEmails]);

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    if (loadingMore) return;

    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    const threshold = clientHeight * 1.5;
    const remainingScroll = scrollHeight - scrollTop;

    if (remainingScroll <= threshold && nextCursor) {
      setLoadingMore(true);
      fetchEmails(nextCursor);
    }
  }, 200);

  useEffect(() => {
    if (session) fetchEmails();
  }, [session, fetchEmails]);

  const handleDelete = async (email: Email) => {
    try {
      const response = await fetch(`/api/emails/${email.id}`, {
        method: "DELETE",
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

      // 如果删除的是当前选中的邮箱,清除选择
      if (selectedEmailId === email.id) {
        onEmailSelect(null);
      }

      toast({
        title: "成功",
        description: "邮箱已删除",
      });

      // 无感刷新: 下次轮询时会自动过滤掉已删除的邮箱
      // 不需要强制刷新,保持用户体验流畅
    } catch {
      toast({
        title: "错误",
        description: "删除邮箱失败",
        variant: "destructive",
      });
    } finally {
      setEmailToDelete(null);
    }
  };

  const toggleSelectEmail = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(emails.map((e) => e.id));
    }
  };

  const handleBatchDelete = async () => {
    try {
      const deletePromises = selectedEmails.map((emailId) =>
        fetch(`/api/emails/${emailId}`, { method: "DELETE" })
      );

      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      toast({
        title: "删除完成",
        description: `成功删除 ${successCount} 个邮箱${
          failCount > 0 ? `，${failCount} 个失败` : ""
        }`,
      });

      setSelectedEmails([]);

      // 无感刷新: 下次轮询时会自动过滤掉已删除的邮箱
    } catch {
      toast({
        title: "错误",
        description: "批量删除失败",
        variant: "destructive",
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-2 flex justify-between items-center border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn("h-8 w-8", refreshing && "animate-spin")}
              title="手动刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {emails.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSelectAll}
                  className="h-8 w-8"
                  title={
                    selectedEmails.length === emails.length
                      ? "取消全选"
                      : "全选"
                  }
                >
                  {selectedEmails.length === emails.length ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
                {selectedEmails.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBatchDeleteDialogOpen(true)}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除 ({selectedEmails.length})
                  </Button>
                )}
              </>
            )}
            <span className="text-xs text-gray-500">
              {role === ROLES.EMPEROR
                ? `${total}/∞ 个邮箱`
                : `${total}/${
                    config?.maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS
                  } 个邮箱`}
            </span>
          </div>
          {canCreateEmail && <CreateDialog onEmailCreated={handleRefresh} />}
        </div>

        <div className="flex-1 overflow-auto p-2" onScroll={handleScroll}>
          {loading ? (
            <EmailListSkeleton />
          ) : emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((email, index) => (
                <EmailItem
                  key={email.id}
                  email={email}
                  index={index}
                  isSelected={selectedEmailId === email.id}
                  isChecked={selectedEmails.includes(email.id)}
                  onSelect={onEmailSelect}
                  onDelete={setEmailToDelete}
                  onToggleCheck={toggleSelectEmail}
                />
              ))}
              {loadingMore && (
                <div className="text-center text-sm text-gray-500 py-2 animate-pulse">
                  加载更多...
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={Mail}
              title="还没有临时邮箱"
              description="点击右上角的「创建新邮箱」按钮开始使用"
            />
          )}
        </div>
      </div>

      <AlertDialog
        open={!!emailToDelete}
        onOpenChange={() => setEmailToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除邮箱 {emailToDelete?.address}{" "}
              吗？此操作将同时删除该邮箱中的所有邮件，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => emailToDelete && handleDelete(emailToDelete)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedEmails.length}{" "}
              个邮箱吗？此操作将同时删除这些邮箱中的所有邮件，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleBatchDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

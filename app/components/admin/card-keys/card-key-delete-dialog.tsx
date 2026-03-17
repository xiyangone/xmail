"use client";

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
import { useTranslations } from "next-intl";

interface CardKeyDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteTarget: { type: "single" | "batch"; id?: string; count?: number } | null;
  onConfirm: () => void;
}

export function CardKeyDeleteDialog({
  open, onOpenChange, deleteTarget, onConfirm,
}: CardKeyDeleteDialogProps) {
  const t = useTranslations("cardKey");
  const tc = useTranslations("common");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.type === "batch"
              ? t("confirmDeleteBatch", { count: deleteTarget.count ?? 0 })
              : t("confirmDeleteSingle")}
            <br />
            <span className="text-destructive font-medium">
              {t("confirmDeleteWarning")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            {t("confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

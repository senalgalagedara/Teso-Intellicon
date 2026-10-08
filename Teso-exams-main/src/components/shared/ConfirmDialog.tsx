"use client";

import React from "react";
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
import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/components/ui/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive" | "success";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";
  
  let iconColor = "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50 text-violet-600 dark:text-violet-400";
  let actionBtn = "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20";
  
  if (variant === "destructive") {
    iconColor = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400";
    actionBtn = "bg-red-600 hover:bg-red-700 shadow-red-500/20";
  } else if (variant === "success") {
    iconColor = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400";
    actionBtn = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20";
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border bg-background p-6 rounded-2xl shadow-xl">
        <AlertDialogHeader className="flex flex-col items-center text-center sm:text-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border",
            iconColor
          )}>
            {isDestructive ? (
              <AlertCircle className="w-6 h-6 animate-bounce" />
            ) : (
              <HelpCircle className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <div className="space-y-2">
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3 mt-6">
          <AlertDialogCancel 
            disabled={isLoading}
            className="w-full sm:w-auto h-10 px-5 font-semibold rounded-xl transition-all cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              "w-full sm:w-auto h-10 px-5 font-bold text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
              actionBtn
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

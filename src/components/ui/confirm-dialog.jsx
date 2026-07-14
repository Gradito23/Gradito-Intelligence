import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  secondaryLabel,
  onSecondary,
  variant = 'default',
  onConfirm,
  loading = false,
  confirmDisabled = false,
  hideConfirm = false,
}) {
  const handleConfirm = async () => {
    await onConfirm?.();
    onOpenChange?.(false);
  };

  const handleSecondary = async () => {
    await onSecondary?.();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          {secondaryLabel && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={handleSecondary}
            >
              {secondaryLabel}
            </Button>
          )}
          {!hideConfirm && (
            variant === 'destructive' ? (
              <Button
                variant="destructive"
                disabled={loading || confirmDisabled}
                onClick={handleConfirm}
              >
                {loading ? 'Working…' : confirmLabel}
              </Button>
            ) : (
              <AlertDialogAction
                disabled={loading || confirmDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
              >
                {loading ? 'Working…' : confirmLabel}
              </AlertDialogAction>
            )
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState, useCallback, useRef } from "react";

// Promise-based replacement for the native confirm() dialog - lets a call
// site await a decision exactly like confirm() used to, but renders the
// branded <ConfirmModal /> instead of the browser's own unstylable dialog.
// See src/components/shared/ConfirmModal.tsx and docs/IYILESTIRME_PLANI.md Faz 4.
//
// Usage:
//   const { confirm, confirmProps } = useConfirm();
//   ...
//   const ok = await confirm({ title: t("Delete Company"), message: "..." , danger: true });
//   if (ok) { ...actually delete... }
//   ...
//   return <>{ui}<ConfirmModal {...confirmProps} /></>;

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmRequest): Promise<boolean> => {
    setRequest(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirmProps = {
    open: !!request,
    title: request?.title || "",
    message: request?.message || "",
    confirmLabel: request?.confirmLabel || "Confirm",
    cancelLabel: request?.cancelLabel || "Cancel",
    danger: request?.danger,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { confirm, confirmProps };
}

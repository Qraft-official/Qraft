type ConfirmOpts = {
  kind: "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOpts = {
  kind: "prompt";
  title: string;
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
};

export type AppDialogRequest = ConfirmOpts | PromptOpts;

type Pending = {
  request: AppDialogRequest;
  resolve: (value: string | boolean | null) => void;
};

let pending: Pending | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeAppDialog(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getAppDialogPending() {
  return pending;
}

export function confirmDialog(opts: Omit<ConfirmOpts, "kind">) {
  return new Promise<boolean>((resolve) => {
    pending = {
      request: { kind: "confirm", confirmLabel: "OK", cancelLabel: "キャンセル", ...opts },
      resolve: (v) => resolve(Boolean(v)),
    };
    emit();
  });
}

export function promptDialog(opts: Omit<PromptOpts, "kind">) {
  return new Promise<string | null>((resolve) => {
    pending = {
      request: {
        kind: "prompt",
        confirmLabel: "挿入",
        cancelLabel: "キャンセル",
        defaultValue: "",
        ...opts,
      },
      resolve: (v) => resolve(typeof v === "string" ? v : null),
    };
    emit();
  });
}

export function settleAppDialog(value: string | boolean | null) {
  const cur = pending;
  pending = null;
  emit();
  cur?.resolve(value);
}

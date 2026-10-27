"use client";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { ArrowRight, Check, LoaderCircle, X, AlertCircle } from "lucide-react";
export function Brand() {
  return (
    <>
      <svg
        className="brand-mark"
        width="28"
        height="30"
        viewBox="0 0 28 30"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 3v24M11 3v24M17 3h7v24h-7"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M17 11h7" stroke="var(--blue)" strokeWidth="3" />
      </svg>
      <span className="brand-name">
        margin<span className="brand-period">.</span>
      </span>
    </>
  );
}

export function PageHeader({
  index,
  label,
  title,
  description,
  action,
  headingLevel = 1,
}: {
  index: string;
  label: string;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header className="page-header">
      <div className="sheet-label">
        <span>
          {index} / {label}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <Heading className="page-title">{title}</Heading>
          {description && <p className="page-description">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Button({
  children,
  variant = "primary",
  busy = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${className}`}
      aria-busy={busy}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      className={`icon-button ${props.className || ""}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
export function Empty({
  symbol,
  title,
  children,
  action,
}: {
  symbol?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {symbol && <div className="empty-symbol">{symbol}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function ErrorBox({
  message,
  onClose,
}: {
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={17} />
      <span>{message}</span>
      {onClose && (
        <IconButton label="Dismiss error" onClick={onClose}>
          <X size={16} />
        </IconButton>
      )}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current!.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  verb = "Delete",
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  verb?: string;
}) {
  const ref = useRef(false);
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="muted">{description}</p>
      <div className="form-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            if (ref.current) return;
            ref.current = true;
            try {
              await onConfirm();
              onClose();
            } finally {
              ref.current = false;
            }
          }}
        >
          {verb}
        </Button>
      </div>
    </Dialog>
  );
}
export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
export function Saved({
  saved,
  onClick,
  label = "Collect",
}: {
  saved: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button variant="secondary" disabled={saved} onClick={onClick}>
      {saved ? <Check size={15} /> : <ArrowRight size={15} />}{" "}
      {saved ? "Collected" : label}
    </Button>
  );
}

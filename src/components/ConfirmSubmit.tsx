"use client";

export default function ConfirmSubmit({
  message,
  label,
  className,
  children,
}: {
  message: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
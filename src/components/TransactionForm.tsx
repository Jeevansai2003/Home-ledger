"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import SubmitButton from "./SubmitButton";

type Option = { id: string; name: string };
type Category = Option & { type: "INCOME" | "EXPENSE" };
type TxType = "INCOME" | "EXPENSE";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  accounts: Option[];
  members: Option[];
  currentUserId: string;
  today: string;
  submitLabel: string;
  pendingText: string;
  error?: string;
  defaults?: {
    id: string;
    amount: string;
    date: string;
    categoryId: string;
    accountId: string;
    userId: string;
    note: string;
  };
};

const tabs = [
  { value: "EXPENSE", label: "Expense", on: "bg-expense-soft text-expense" },
  { value: "INCOME", label: "Income", on: "bg-income-soft text-income" },
] as const;

export default function TransactionForm({
  action,
  categories,
  accounts,
  members,
  currentUserId,
  today,
  submitLabel,
  pendingText,
  error,
  defaults,
}: Props) {
  const startType: TxType = categories.find((c) => c.id === defaults?.categoryId)?.type ?? "EXPENSE";
  const [type, setType] = useState<TxType>(startType);
  const [categoryId, setCategoryId] = useState(defaults?.categoryId ?? "");
  const visible = categories.filter((c) => c.type === type);

  function pickType(next: TxType) {
    if (next === type) return;
    setType(next);
    setCategoryId("");
  }

  return (
    <form action={action} className="space-y-4">
      {defaults && <input type="hidden" name="id" value={defaults.id} />}

      {error && (
        <div role="alert" className="alert-error flex gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={type === t.value}
            onClick={() => pickType(t.value)}
            className={`h-9 rounded-md text-sm font-medium transition-colors ${
              type === t.value ? t.on : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="tx-amount" className="field-label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
            ₹
          </span>
          <input
            id="tx-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            autoFocus={!defaults}
            defaultValue={defaults?.amount}
            placeholder="0.00"
            className="input num h-12 pl-8 text-lg font-medium"
          />
        </div>
      </div>

      <div>
        <label htmlFor="tx-category" className="field-label">Category</label>
        <select
          id="tx-category"
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="" disabled>Choose a category</option>
          {visible.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tx-date" className="field-label">Date</label>
          <input id="tx-date" name="date" type="date" required defaultValue={defaults?.date ?? today} className="input" />
        </div>
        <div>
          <label htmlFor="tx-account" className="field-label">Account</label>
          <select id="tx-account" name="accountId" required defaultValue={defaults?.accountId ?? accounts[0]?.id} className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tx-user" className="field-label">{type === "EXPENSE" ? "Paid by" : "Received by"}</label>
        <select id="tx-user" name="userId" required defaultValue={defaults?.userId ?? currentUserId} className="input">
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tx-note" className="field-label">Note <span className="font-normal text-muted">(optional)</span></label>
        <input id="tx-note" name="note" maxLength={120} defaultValue={defaults?.note} placeholder="e.g. Weekly vegetables" className="input" />
      </div>

      <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
    </form>
  );
}
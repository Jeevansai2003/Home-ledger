import { AlertCircle } from "lucide-react";
import SubmitButton from "./SubmitButton";

type Option = { id: string; name: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Option[];
  accounts: Option[];
  today: string;
  submitLabel: string;
  pendingText: string;
  error?: string;
  defaults?: {
    id: string;
    name: string;
    amount: string;
    frequency: string;
    nextDue: string;
    categoryId: string;
    accountId: string;
  };
};

export default function BillForm({
  action,
  categories,
  accounts,
  today,
  submitLabel,
  pendingText,
  error,
  defaults,
}: Props) {
  return (
    <form action={action} className="space-y-4">
      {defaults && <input type="hidden" name="id" value={defaults.id} />}

      {error && (
        <div role="alert" className="alert-error flex gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="bill-name" className="field-label">Bill name</label>
        <input
          id="bill-name"
          name="name"
          required
          maxLength={60}
          defaultValue={defaults?.name}
          placeholder="e.g. House rent"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="bill-amount" className="field-label">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">₹</span>
            <input
              id="bill-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              defaultValue={defaults?.amount}
              placeholder="0.00"
              className="input num pl-8"
            />
          </div>
        </div>
        <div>
          <label htmlFor="bill-frequency" className="field-label">Repeats</label>
          <select id="bill-frequency" name="frequency" defaultValue={defaults?.frequency ?? "MONTHLY"} className="input">
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="bill-due" className="field-label">{defaults ? "Next due date" : "First due date"}</label>
        <input
          id="bill-due"
          name="nextDue"
          type="date"
          required
          defaultValue={defaults?.nextDue ?? today}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="bill-category" className="field-label">Category</label>
        <select id="bill-category" name="categoryId" required defaultValue={defaults?.categoryId ?? ""} className="input">
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="bill-account" className="field-label">Paid from</label>
        <select id="bill-account" name="accountId" defaultValue={defaults?.accountId ?? ""} className="input">
          <option value="">Not set (uses your first account)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <SubmitButton pendingText={pendingText}>{submitLabel}</SubmitButton>
    </form>
  );
}
type Option = { id: string; name: string };
type Category = Option & { type: "INCOME" | "EXPENSE" };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  accounts: Option[];
  members: Option[];
  currentUserId: string;
  submitLabel: string;
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

export default function TransactionForm({
  action,
  categories,
  accounts,
  members,
  currentUserId,
  submitLabel,
  error,
  defaults,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const expenses = categories.filter((c) => c.type === "EXPENSE");
  const incomes = categories.filter((c) => c.type === "INCOME");

  return (
    <form action={action} className="grid gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-2">
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-600 sm:col-span-2">{error}</p>
      )}

      <label className="text-sm">
        Amount (₹)
        <input name="amount" type="number" step="0.01" min="0.01" required
          defaultValue={defaults?.amount} className="mt-1 w-full rounded border p-2" />
      </label>

      <label className="text-sm">
        Date
        <input name="date" type="date" required defaultValue={defaults?.date ?? today}
          className="mt-1 w-full rounded border p-2" />
      </label>

      <label className="text-sm">
        Category
        <select name="categoryId" required defaultValue={defaults?.categoryId ?? ""}
          className="mt-1 w-full rounded border p-2">
          <option value="" disabled>Select category</option>
          <optgroup label="Expenses">
            {expenses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
          <optgroup label="Income">
            {incomes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        </select>
      </label>

      <label className="text-sm">
        Account
        <select name="accountId" required defaultValue={defaults?.accountId ?? accounts[0]?.id}
          className="mt-1 w-full rounded border p-2">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      <label className="text-sm">
        Paid / received by
        <select name="userId" required defaultValue={defaults?.userId ?? currentUserId}
          className="mt-1 w-full rounded border p-2">
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>

      <label className="text-sm">
        Note
        <input name="note" defaultValue={defaults?.note} placeholder="Optional"
          className="mt-1 w-full rounded border p-2" />
      </label>

      <button className="rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700 sm:col-span-2">
        {submitLabel}
      </button>
    </form>
  );
}
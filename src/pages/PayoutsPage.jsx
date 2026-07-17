import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiEye, FiX } from "react-icons/fi";
import DataTable from "../components/data-table/DataTable";
import { adminApi } from "../config/api";

const MAIN_TABS = [
  { key: "withdrawals", label: "Withdrawals" },
  { key: "remittances", label: "Remittances" },
];

const WITHDRAWAL_STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
];

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `Rs ${n.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskAccount(account) {
  const digits = String(account || "").replace(/\s/g, "");
  if (!digits) return "—";
  if (digits.length <= 4) return digits;
  return `****${digits.slice(-4)}`;
}

function riderLabel(row) {
  const name = row?.rider?.fullName || "—";
  const phone = row?.rider?.phone;
  return phone ? `${name} · ${phone}` : name;
}

function StatusPill({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
    cancelled: "bg-slate-100 text-slate-600",
    pending_remit: "bg-amber-50 text-amber-700",
    remitted: "bg-emerald-50 text-emerald-700",
  };
  const label =
    status === "pending_remit"
      ? "Pending remit"
      : status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : "—";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

function Modal({ open, title, onClose, children, footer, wide = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function actionLabel(action) {
  switch (action) {
    case "approve":
      return "Approve";
    case "reject":
      return "Reject";
    case "mark_paid":
      return "Mark paid";
    case "remit":
      return "Mark remitted";
    default:
      return "Confirm";
  }
}

function PayoutsPage({ adminToken, onUnauthorized }) {
  const [mainTab, setMainTab] = useState("withdrawals");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actingId, setActingId] = useState("");
  const [detailRow, setDetailRow] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const lastQueryRef = useRef(null);
  const controllerRef = useRef(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    }),
    [adminToken],
  );

  const fetchList = useCallback(
    async (query) => {
      if (!adminToken) return;
      lastQueryRef.current = query;

      controllerRef.current?.abort?.();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        setLoading(true);
        setError("");

        const limit = Number(query.pageSize) || 25;
        const page = Number(query.page) || 1;
        const offset = Math.max(0, (page - 1) * limit);

        const url = new URL(
          mainTab === "withdrawals"
            ? adminApi.payoutsWithdrawals
            : adminApi.payoutsRemittances,
        );
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));
        if (mainTab === "withdrawals" && statusFilter) {
          url.searchParams.set("status", statusFilter);
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers,
        });

        if (response.status === 401) {
          onUnauthorized?.();
          return;
        }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload.message || `Request failed (${response.status})`,
          );
        }

        const data = payload.data ?? {};
        setRows(Array.isArray(data.items) ? data.items : []);
        setTotalRows(Number(data.total ?? 0));
      } catch (err) {
        if (err.name === "AbortError") return;
        setRows([]);
        setTotalRows(0);
        setError(err.message || "Failed to load payouts");
      } finally {
        setLoading(false);
      }
    },
    [adminToken, headers, mainTab, onUnauthorized, statusFilter],
  );

  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    setRows([]);
    setTotalRows(0);
    setSuccess("");
    setError("");
  }, [mainTab, statusFilter]);

  const refresh = useCallback(async () => {
    if (lastQueryRef.current) {
      await fetchList(lastQueryRef.current);
    }
  }, [fetchList]);

  const openConfirm = useCallback((row, action) => {
    setAdminNote("");
    setConfirmState({ row, action });
  }, []);

  const closeConfirm = useCallback(() => {
    if (actingId) return;
    setConfirmState(null);
    setAdminNote("");
  }, [actingId]);

  const submitAction = useCallback(async () => {
    if (!confirmState?.row?.id || !confirmState.action) return;
    const { row, action } = confirmState;
    try {
      setActingId(row.id);
      setError("");
      setSuccess("");

      let url;
      let body;
      if (action === "remit") {
        url = adminApi.payoutRemit(row.id);
        body = { adminNote: adminNote.trim() || undefined };
      } else {
        url = adminApi.payoutWithdrawal(row.id);
        body = {
          action,
          adminNote: adminNote.trim() || undefined,
        };
      }

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.message || `Request failed (${response.status})`,
        );
      }

      setSuccess(payload.message || `${actionLabel(action)} succeeded`);
      setConfirmState(null);
      setAdminNote("");
      setDetailRow(null);
      await refresh();
    } catch (err) {
      setError(err.message || "Action failed");
    } finally {
      setActingId("");
    }
  }, [adminNote, confirmState, headers, onUnauthorized, refresh]);

  const withdrawalColumns = useMemo(
    () => [
      {
        key: "rider",
        label: "Rider",
        sortable: false,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {row.rider?.fullName || "—"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.rider?.phone || "—"}
            </p>
          </div>
        ),
        getExportValue: (row) => riderLabel(row),
      },
      {
        key: "amount",
        label: "Amount",
        sortable: false,
        render: (row) => (
          <span className="font-semibold text-slate-900">
            {formatMoney(row.amount)}
          </span>
        ),
        getExportValue: (row) => formatMoney(row.amount),
      },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusPill status={row.status} />,
        getExportValue: (row) => row.status || "",
      },
      {
        key: "bank",
        label: "Bank",
        sortable: false,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-800">
              {row.bankName || "—"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {maskAccount(row.bankAccountNumber)}
            </p>
          </div>
        ),
        getExportValue: (row) =>
          `${row.bankName || ""} ${maskAccount(row.bankAccountNumber)}`.trim(),
      },
      {
        key: "requestedAt",
        label: "Requested",
        sortable: false,
        render: (row) => (
          <span className="text-sm text-slate-700">
            {formatDate(row.requestedAt)}
          </span>
        ),
        getExportValue: (row) => formatDate(row.requestedAt),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        exportable: false,
        render: (row) => {
          const status = row.status;
          const busy = actingId === row.id;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDetailRow(row)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FiEye size={12} />
                View
              </button>
              {status === "pending" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openConfirm(row, "approve")}
                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  Approve
                </button>
              ) : null}
              {status === "pending" || status === "approved" ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openConfirm(row, "mark_paid")}
                    className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openConfirm(row, "reject")}
                    className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [actingId, openConfirm],
  );

  const remittanceColumns = useMemo(
    () => [
      {
        key: "rider",
        label: "Rider",
        sortable: false,
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {row.rider?.fullName || "—"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.rider?.phone || "—"}
            </p>
          </div>
        ),
        getExportValue: (row) => riderLabel(row),
      },
      {
        key: "order",
        label: "Order",
        sortable: false,
        render: (row) => {
          const n = row.orderNumber || row.orderId || "—";
          return (
            <span className="text-sm font-medium text-slate-900">
              {String(n).startsWith("#") || n === "—" ? n : `#${n}`}
            </span>
          );
        },
        getExportValue: (row) => row.orderNumber || row.orderId || "",
      },
      {
        key: "platformDue",
        label: "Platform due",
        sortable: false,
        render: (row) => (
          <span className="font-semibold text-amber-700">
            {formatMoney(row.platformDue)}
          </span>
        ),
        getExportValue: (row) => formatMoney(row.platformDue),
      },
      {
        key: "cashCollected",
        label: "Cash collected",
        sortable: false,
        render: (row) => formatMoney(row.cashCollected),
        getExportValue: (row) => formatMoney(row.cashCollected),
      },
      {
        key: "netAmount",
        label: "Net",
        sortable: false,
        render: (row) => formatMoney(row.netAmount),
        getExportValue: (row) => formatMoney(row.netAmount),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: false,
        render: (row) => formatDate(row.createdAt),
        getExportValue: (row) => formatDate(row.createdAt),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        exportable: false,
        render: (row) => (
          <button
            type="button"
            disabled={actingId === row.id}
            onClick={() => openConfirm(row, "remit")}
            className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            Mark remitted
          </button>
        ),
      },
    ],
    [actingId, openConfirm],
  );

  const settlements = Array.isArray(detailRow?.settlements)
    ? detailRow.settlements
    : [];

  return (
    <section className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-[34px] font-semibold leading-none text-slate-900">
          Payouts
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Approve rider withdrawals and mark cash remittances as received.
        </p>
      </div>

      {error ? (
        <p className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMainTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              mainTab === tab.key
                ? "bg-brand-orange text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "withdrawals" ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {WITHDRAWAL_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key || "all"}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                statusFilter === filter.key
                  ? "border-brand-orange bg-rose-50 text-brand-orange"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      <DataTable
        key={`payouts-${mainTab}-${statusFilter}`}
        className="min-h-0 flex-1"
        columns={
          mainTab === "withdrawals" ? withdrawalColumns : remittanceColumns
        }
        data={rows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          mainTab === "withdrawals"
            ? "No withdrawal requests found."
            : "No pending remittances."
        }
        enableSearch={false}
        dataMode="server"
        serverTotalRows={totalRows}
        onQueryChange={fetchList}
        exportFileName={`payouts-${mainTab}`}
        fullWidth
        maxHeight="100%"
        defaultPageSize={25}
      />

      <Modal
        open={Boolean(detailRow)}
        title="Withdrawal details"
        onClose={() => setDetailRow(null)}
        wide
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDetailRow(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        }
      >
        {detailRow ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatMoney(detailRow.amount)}
                </p>
              </div>
              <StatusPill status={detailRow.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Rider</p>
                <p className="font-medium text-slate-900">
                  {riderLabel(detailRow)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Requested</p>
                <p className="font-medium text-slate-900">
                  {formatDate(detailRow.requestedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Processed</p>
                <p className="font-medium text-slate-900">
                  {formatDate(detailRow.processedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Processed by</p>
                <p className="font-medium text-slate-900">
                  {detailRow.processedBy || "—"}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bank account
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-slate-500">Holder: </span>
                  {detailRow.bankAccountHolderName || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Bank: </span>
                  {detailRow.bankName || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Account: </span>
                  {maskAccount(detailRow.bankAccountNumber)}
                </p>
                <p>
                  <span className="text-slate-500">IFSC: </span>
                  {detailRow.bankIfscCode || "—"}
                </p>
              </div>
            </div>
            {detailRow.adminNote ? (
              <div>
                <p className="text-xs text-slate-500">Admin note</p>
                <p className="font-medium text-slate-900">
                  {detailRow.adminNote}
                </p>
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Included settlements
              </p>
              {settlements.length === 0 ? (
                <p className="text-slate-500">No settlements listed.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {settlements.map((s) => {
                    const orderRef = s.orderNumber || s.orderId || "Order";
                    const label = String(orderRef).startsWith("#")
                      ? orderRef
                      : `#${orderRef}`;
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="font-medium text-slate-800">
                          {label}
                        </span>
                        <span className="text-slate-700">
                          {formatMoney(s.netAmount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmState)}
        title={actionLabel(confirmState?.action)}
        onClose={closeConfirm}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeConfirm}
              disabled={Boolean(actingId)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitAction}
              disabled={Boolean(actingId)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                confirmState?.action === "reject"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-brand-orange hover:opacity-90"
              }`}
            >
              {actingId ? "Working…" : actionLabel(confirmState?.action)}
            </button>
          </div>
        }
      >
        {confirmState ? (
          <div className="space-y-3 text-sm">
            <p className="text-slate-700">
              {confirmState.action === "remit" ? (
                <>
                  Mark remittance for{" "}
                  <strong>{riderLabel(confirmState.row)}</strong> (
                  {formatMoney(confirmState.row.platformDue)}) as received?
                </>
              ) : (
                <>
                  {actionLabel(confirmState.action)} withdrawal of{" "}
                  <strong>{formatMoney(confirmState.row.amount)}</strong> for{" "}
                  <strong>{riderLabel(confirmState.row)}</strong>?
                </>
              )}
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Admin note (optional)
              </span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-orange"
                placeholder="Add a note for the audit trail"
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export default PayoutsPage;

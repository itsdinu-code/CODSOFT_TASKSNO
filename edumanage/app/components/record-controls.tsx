"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

export function RecordControls({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  filterLabel = "All statuses",
  filterOptions,
  sort,
  onSortChange,
  sortOptions,
  page,
  pageCount,
  total,
  onPageChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  filterLabel?: string;
  filterOptions: { value: string; label: string }[];
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: { value: string; label: string }[];
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
      <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_minmax(150px,0.45fr)_minmax(150px,0.45fr)]">
        <label className="relative block">
          <span className="sr-only">Search records</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search records"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label>
          <span className="sr-only">Filter records</span>
          <select value={filter} onChange={(event) => onFilterChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
            <option value="">{filterLabel}</option>
            {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort records</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
            <span aria-live="polite">Page {page} of {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="min-h-10 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
      className="fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Deleting…" : confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

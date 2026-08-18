import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamSidebar({
  users,
  selectedIds,
  onToggle,
  onSelectAll,
  onSelectOnly,
  focusedUserId,
  onClearFocus,
  open,
  onClose,
}) {
  const allSelected = users.length > 0 && selectedIds.length === users.length;

  const content = (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="font-heading font-bold text-slate-900">Equipe</div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg hover:bg-slate-100"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-3 border-b border-slate-100">
        <button
          data-testid="filter-all-users"
          onClick={onSelectAll}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            allSelected && !focusedUserId ? "bg-sky-50 text-sky-700" : "hover:bg-slate-50 text-slate-700"
          }`}
        >
          <Checkbox checked={allSelected} className="pointer-events-none" />
          <span className="font-semibold text-sm">Todos</span>
          <span className="ml-auto text-xs text-slate-400">{users.length}</span>
        </button>
      </div>

      {focusedUserId && (
        <div className="px-5 py-3 border-b border-slate-100 bg-amber-50/60">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-1">Visualização individual</div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Agenda de {users.find((u) => u.id === focusedUserId)?.name}
            </div>
            <button
              data-testid="clear-focus"
              onClick={onClearFocus}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1">
        {users.map((u) => {
          const checked = selectedIds.includes(u.id);
          const focused = focusedUserId === u.id;
          return (
            <div
              key={u.id}
              className={`group flex items-center gap-3 px-2 py-2 rounded-xl transition-colors ${
                focused ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <Checkbox
                data-testid={`user-toggle-${u.id}`}
                checked={checked}
                onCheckedChange={() => onToggle(u.id)}
              />
              <button
                data-testid={`user-focus-${u.id}`}
                onClick={() => onSelectOnly(u.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: u.color }}
                />
                <span className="text-sm font-medium text-slate-800 truncate">{u.name}</span>
                {!u.active && (
                  <span className="ml-auto text-[10px] font-semibold uppercase text-slate-400">off</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-72 border-r border-slate-200 bg-white h-[calc(100vh-64px)] sticky top-16">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

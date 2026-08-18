import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { AlertTriangle, Trash2, Save, X, Lock, MapPin, Clock, User as UserIcon } from "lucide-react";
import { toISODate, parseISODate } from "@/lib/dateUtils";

const COLOR_PALETTE = ["#0ea5e9", "#10b981", "#a855f7", "#f97316", "#ef4444", "#eab308", "#14b8a6", "#ec4899"];

export default function AppointmentModal({
  open,
  onClose,
  mode, // 'create' | 'edit' | 'view'
  initial, // { date, hour } for create, appointment for edit/view
  currentUser,
  users,
  onSaved,
  onDeleted,
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(currentUser?.color || "#0ea5e9");
  const [conflicts, setConflicts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const owner = users.find((u) => u.id === initial?.user_id);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      const d = initial?.date || new Date();
      setTitle("");
      setDate(toISODate(d));
      const h = initial?.hour ?? 8;
      setStartTime(String(h).padStart(2, "0") + ":00");
      setEndTime(String(h + 1).padStart(2, "0") + ":00");
      setLocation("");
      setDescription("");
      setColor(currentUser?.color || "#0ea5e9");
    } else if (initial) {
      setTitle(initial.title);
      setDate(initial.date);
      setStartTime(initial.start_time);
      setEndTime(initial.end_time);
      setLocation(initial.location || "");
      setDescription(initial.description || "");
      setColor(initial.color || currentUser?.color || "#0ea5e9");
    }
    setConflicts([]);
  }, [open, mode, initial, currentUser]);

  // Live conflict check
  useEffect(() => {
    if (!open || isView) return;
    if (!date || !startTime || !endTime || endTime <= startTime) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/appointments/conflicts", {
          params: {
            date,
            start_time: startTime,
            end_time: endTime,
            exclude_id: isEdit ? initial?.id : undefined,
          },
          signal: controller.signal,
        });
        setConflicts(data);
      } catch { /* ignore */ }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [date, startTime, endTime, open, isView, isEdit, initial?.id]);

  const save = async () => {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (endTime <= startTime) { toast.error("Horário final deve ser após o inicial"); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), date, start_time: startTime, end_time: endTime, location, description, color };
      if (isEdit) {
        const { data } = await api.put(`/appointments/${initial.id}`, payload);
        toast.success("Compromisso atualizado com sucesso.");
        onSaved(data);
      } else {
        const { data } = await api.post("/appointments", payload);
        toast.success("Compromisso criado com sucesso.");
        onSaved(data);
      }
      onClose();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    try {
      await api.delete(`/appointments/${initial.id}`);
      toast.success("Compromisso excluído com sucesso.");
      onDeleted(initial.id);
      onClose();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const canEdit = !isView && (currentUser?.role === "admin" || initial?.user_id === currentUser?.id || mode === "create");
  const canDelete = isEdit && (currentUser?.role === "admin" || initial?.user_id === currentUser?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent data-testid="appointment-modal" className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {mode === "create" ? "Novo compromisso" : mode === "edit" ? "Editar compromisso" : initial?.title}
            </DialogTitle>
            {isView && (
              <DialogDescription className="flex items-center gap-2 pt-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: owner?.color }} />
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm text-slate-700 font-semibold">{owner?.name || "—"}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {isView ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{initial.date.split("-").reverse().join("/")}</span>
                <span>· {initial.start_time} – {initial.end_time}</span>
              </div>
              {initial.location && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{initial.location}</span>
                </div>
              )}
              {initial.description && (
                <div className="p-3 rounded-xl bg-slate-50 text-sm text-slate-700 whitespace-pre-wrap">
                  {initial.description}
                </div>
              )}
              {!canDelete && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Apenas o proprietário pode alterar este compromisso.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="title" className="text-slate-700 font-medium">Título</Label>
                <Input id="title" data-testid="appt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião pedagógica" className="mt-1 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <Label htmlFor="date" className="text-slate-700 font-medium">Data</Label>
                  <Input id="date" data-testid="appt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="start" className="text-slate-700 font-medium">Início</Label>
                  <Input id="start" data-testid="appt-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="end" className="text-slate-700 font-medium">Fim</Label>
                  <Input id="end" data-testid="appt-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="location" className="text-slate-700 font-medium">Local</Label>
                <Input id="location" data-testid="appt-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Sala 12" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="desc" className="text-slate-700 font-medium">Observações</Label>
                <Textarea id="desc" data-testid="appt-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 rounded-xl resize-none" />
              </div>
              <div>
                <Label className="text-slate-700 font-medium">Cor</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      data-testid={`color-${c}`}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-slate-800" : "border-white"}`}
                      style={{ backgroundColor: c, boxShadow: "0 0 0 1px #e2e8f0" }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              {conflicts.length > 0 && (
                <div data-testid="conflict-warning" className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm animate-pulse">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Existem outros compromissos neste horário.</div>
                    <ul className="mt-1 space-y-0.5">
                      {conflicts.map((c) => {
                        const o = users.find((u) => u.id === c.user_id);
                        return (
                          <li key={c.id} className="text-xs">
                            {o?.name || "—"} · {c.title} ({c.start_time}–{c.end_time})
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {canDelete && (
              <Button
                data-testid="btn-delete-appt"
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4 mr-2" /> {isView ? "Fechar" : "Cancelar"}
            </Button>
            {canEdit && (
              <Button data-testid="btn-save-appt" onClick={save} disabled={saving} className="rounded-full bg-sky-500 hover:bg-sky-600">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="btn-confirm-delete" onClick={doDelete} className="rounded-full bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

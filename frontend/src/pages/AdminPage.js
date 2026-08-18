import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Users, Building2 } from "lucide-react";

const COLORS = ["#0ea5e9", "#10b981", "#a855f7", "#f97316", "#ef4444", "#eab308", "#14b8a6", "#ec4899", "#6366f1", "#84cc16"];

function UserFormDialog({ open, onClose, initial, teams, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [teamId, setTeamId] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name); setEmail(initial.email || ""); setPassword("");
      setRole(initial.role); setTeamId(initial.team_id || ""); setColor(initial.color || COLORS[0]);
      setActive(initial.active);
    } else {
      setName(""); setEmail(""); setPassword(""); setRole("user");
      setTeamId(teams[0]?.id || ""); setColor(COLORS[0]); setActive(true);
    }
  }, [open, initial, teams]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name, email, role, team_id: teamId || null, color, active };
      if (password) payload.password = password;
      if (initial) {
        const { data } = await api.put(`/users/${initial.id}`, payload);
        onSaved(data);
        toast.success("Usuário atualizado.");
      } else {
        if (!password) { toast.error("Senha obrigatória"); setSaving(false); return; }
        const { data } = await api.post("/users", payload);
        onSaved(data);
        toast.success("Usuário criado.");
      }
      onClose();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{initial ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input data-testid="user-name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" /></div>
          <div><Label>E-mail</Label><Input data-testid="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" /></div>
          <div><Label>{initial ? "Nova senha (opcional)" : "Senha"}</Label><Input data-testid="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Função</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="user-role" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipe</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger data-testid="user-team" className="rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Cor</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-slate-800 scale-110" : "border-white"}`}
                  style={{ backgroundColor: c, boxShadow: "0 0 0 1px #e2e8f0" }} />
              ))}
            </div>
          </div>
          {initial && (
            <div className="flex items-center justify-between pt-2">
              <Label>Ativo</Label>
              <Switch data-testid="user-active" checked={active} onCheckedChange={setActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
          <Button data-testid="btn-save-user" onClick={save} disabled={saving} className="rounded-full bg-sky-500 hover:bg-sky-600">{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamFormDialog({ open, onClose, initial, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) { setName(initial?.name || ""); setDescription(initial?.description || ""); }
  }, [open, initial]);

  const save = async () => {
    try {
      if (initial) {
        const { data } = await api.put(`/teams/${initial.id}`, { name, description });
        onSaved(data); toast.success("Equipe atualizada.");
      } else {
        const { data } = await api.post("/teams", { name, description });
        onSaved(data); toast.success("Equipe criada.");
      }
      onClose();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{initial ? "Editar equipe" : "Nova equipe"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input data-testid="team-name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" /></div>
          <div><Label>Descrição</Label><Textarea data-testid="team-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl resize-none" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-full">Cancelar</Button>
          <Button data-testid="btn-save-team" onClick={save} className="rounded-full bg-sky-500 hover:bg-sky-600">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [userDialog, setUserDialog] = useState({ open: false, initial: null });
  const [teamDialog, setTeamDialog] = useState({ open: false, initial: null });
  const [confirmDel, setConfirmDel] = useState({ open: false, type: null, id: null });

  const load = useCallback(async () => {
    try {
      const [uRes, tRes] = await Promise.all([api.get("/users"), api.get("/teams")]);
      setUsers(uRes.data); setTeams(tRes.data);
    } catch (e) { toast.error(formatApiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    const { type, id } = confirmDel;
    setConfirmDel({ open: false, type: null, id: null });
    try {
      await api.delete(`/${type}/${id}`);
      toast.success("Excluído com sucesso.");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <h1 className="text-xl font-heading font-black text-slate-900">Administração</h1>
              <p className="text-xs text-slate-500">Gerencie usuários, equipes e configurações</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <Tabs defaultValue="users">
          <TabsList className="rounded-full bg-white border border-slate-200 p-1">
            <TabsTrigger data-testid="tab-users" value="users" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger data-testid="tab-teams" value="teams" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-white"><Building2 className="w-4 h-4 mr-2" />Equipes</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-500">{users.length} usuário(s)</div>
              <Button data-testid="btn-new-user" onClick={() => setUserDialog({ open: true, initial: null })} className="rounded-full bg-sky-500 hover:bg-sky-600"><Plus className="w-4 h-4 mr-2" />Novo usuário</Button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="font-medium"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.color }} />{u.name}</span></TableCell>
                      <TableCell className="text-slate-600">{u.email}</TableCell>
                      <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"} className={u.role === "admin" ? "bg-sky-500" : ""}>{u.role === "admin" ? "Admin" : "Usuário"}</Badge></TableCell>
                      <TableCell className="text-slate-600">{teams.find((t) => t.id === u.team_id)?.name || "—"}</TableCell>
                      <TableCell>{u.active ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Ativo</Badge> : <Badge variant="secondary" className="bg-slate-100 text-slate-500">Inativo</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button data-testid={`btn-edit-user-${u.id}`} variant="ghost" size="icon" onClick={() => setUserDialog({ open: true, initial: u })}><Pencil className="w-4 h-4" /></Button>
                        {u.id !== user.id && (
                          <Button data-testid={`btn-del-user-${u.id}`} variant="ghost" size="icon" onClick={() => setConfirmDel({ open: true, type: "users", id: u.id })} className="text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-slate-500">{teams.length} equipe(s)</div>
              <Button data-testid="btn-new-team" onClick={() => setTeamDialog({ open: true, initial: null })} className="rounded-full bg-sky-500 hover:bg-sky-600"><Plus className="w-4 h-4 mr-2" />Nova equipe</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map((t) => (
                <div key={t.id} data-testid={`card-team-${t.id}`} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-heading font-bold text-slate-900">{t.name}</div>
                      <div className="text-sm text-slate-500 mt-1">{t.description || "Sem descrição"}</div>
                      <div className="text-xs text-slate-400 mt-3">{users.filter((u) => u.team_id === t.id).length} membro(s)</div>
                    </div>
                    <div className="flex gap-1">
                      <Button data-testid={`btn-edit-team-${t.id}`} variant="ghost" size="icon" onClick={() => setTeamDialog({ open: true, initial: t })}><Pencil className="w-4 h-4" /></Button>
                      <Button data-testid={`btn-del-team-${t.id}`} variant="ghost" size="icon" onClick={() => setConfirmDel({ open: true, type: "teams", id: t.id })} className="text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <UserFormDialog open={userDialog.open} onClose={() => setUserDialog({ open: false, initial: null })} initial={userDialog.initial} teams={teams} onSaved={() => load()} />
      <TeamFormDialog open={teamDialog.open} onClose={() => setTeamDialog({ open: false, initial: null })} initial={teamDialog.initial} onSaved={() => load()} />

      <AlertDialog open={confirmDel.open} onOpenChange={(v) => !v && setConfirmDel({ open: false, type: null, id: null })}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction data-testid="btn-confirm-admin-delete" onClick={doDelete} className="rounded-full bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

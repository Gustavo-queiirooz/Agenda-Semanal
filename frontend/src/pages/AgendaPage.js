import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import Header from "@/components/Header";
import TeamSidebar from "@/components/TeamSidebar";
import WeekCalendar from "@/components/WeekCalendar";
import AppointmentModal from "@/components/AppointmentModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { addDays, startOfWeek, toISODate } from "@/lib/dateUtils";
import { toast } from "sonner";

export default function AgendaPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [users, setUsers] = useState([]);
  const [appts, setAppts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const today = new Date();
    const idx = (today.getDay() + 6) % 7;
    return idx < 5 ? idx : 0;
  });

  const [modalState, setModalState] = useState({ open: false, mode: "create", initial: null });

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
      setSelectedIds((prev) => {
        if (prev.length === 0) return data.filter((u) => u.active).map((u) => u.id);
        return prev.filter((id) => data.find((u) => u.id === id));
      });
    } catch (e) { toast.error(formatApiError(e)); }
  }, []);

  const loadAppts = useCallback(async () => {
    try {
      const start = toISODate(weekStart);
      const end = toISODate(addDays(weekStart, 4));
      const { data } = await api.get("/appointments", { params: { start, end } });
      setAppts(data);
    } catch (e) { toast.error(formatApiError(e)); }
  }, [weekStart]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadAppts(); }, [loadAppts]);

  const visibleAppts = useMemo(() => {
    if (focusedUserId) return appts.filter((a) => a.user_id === focusedUserId);
    const set = new Set(selectedIds);
    return appts.filter((a) => set.has(a.user_id));
  }, [appts, selectedIds, focusedUserId]);

  const toggleUser = (id) => {
    setFocusedUserId(null);
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const selectAll = () => { setFocusedUserId(null); setSelectedIds(users.map((u) => u.id)); };
  const selectOnly = (id) => { setFocusedUserId(id); };

  const openCreate = (date, hour) => {
    setModalState({ open: true, mode: "create", initial: { date, hour } });
  };
  const openView = (appt) => {
    const isOwner = appt.user_id === user.id;
    const isAdmin = user.role === "admin";
    setModalState({ open: true, mode: (isOwner || isAdmin) ? "edit" : "view", initial: appt });
  };

  const openQuickCreate = () => {
    const today = new Date();
    setModalState({ open: true, mode: "create", initial: { date: today, hour: 8 } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        weekStart={weekStart}
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
        onToday={() => setWeekStart(startOfWeek(new Date()))}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex">
        <TeamSidebar
          users={users}
          selectedIds={selectedIds}
          onToggle={toggleUser}
          onSelectAll={selectAll}
          onSelectOnly={selectOnly}
          focusedUserId={focusedUserId}
          onClearFocus={() => setFocusedUserId(null)}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 md:p-6 pb-24">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
              {focusedUserId
                ? `Agenda de ${users.find((u) => u.id === focusedUserId)?.name}`
                : "Agenda da Equipe"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Clique em um horário livre para criar um novo compromisso.
            </p>
          </div>

          <WeekCalendar
            weekStart={weekStart}
            appointments={visibleAppts}
            users={users}
            currentUserId={user.id}
            isAdmin={user.role === "admin"}
            onSlotClick={openCreate}
            onEventClick={openView}
            mobileDayIndex={mobileDayIndex}
            onChangeMobileDay={setMobileDayIndex}
          />
        </main>
      </div>

      {/* Floating "+ New" button */}
      <Button
        data-testid="btn-new-appointment"
        onClick={openQuickCreate}
        className="fixed bottom-6 right-6 z-30 rounded-full h-14 pl-5 pr-6 bg-sky-500 hover:bg-sky-600 shadow-xl shadow-sky-300/50 hover:shadow-sky-400/60 text-white font-semibold"
      >
        <Plus className="w-5 h-5 mr-2" />
        Novo compromisso
      </Button>

      <AppointmentModal
        open={modalState.open}
        onClose={() => setModalState({ ...modalState, open: false })}
        mode={modalState.mode}
        initial={modalState.initial}
        currentUser={user}
        users={users}
        onSaved={(a) => {
          setAppts((prev) => {
            const filtered = prev.filter((x) => x.id !== a.id);
            return [...filtered, a];
          });
        }}
        onDeleted={(id) => setAppts((prev) => prev.filter((x) => x.id !== id))}
      />
    </div>
  );
}

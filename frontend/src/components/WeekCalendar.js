import React from "react";
import { HOURS, WEEKDAYS, WEEKDAYS_SHORT, addDays, isSameDay, timeToHour, toISODate } from "@/lib/dateUtils";
import { MapPin } from "lucide-react";

function EventBlock({ appt, owner, canEdit, onClick, laneIndex, lanes }) {
  const startH = timeToHour(appt.start_time);
  const endH = timeToHour(appt.end_time);
  const top = (startH - 7) * 60; // 60px per hour
  const height = Math.max(28, (endH - startH) * 60 - 4);
  const widthPct = 100 / lanes;
  const leftPct = widthPct * laneIndex;
  const color = appt.color || owner?.color || "#0ea5e9";

  return (
    <button
      data-testid={`event-${appt.id}`}
      onClick={(e) => { e.stopPropagation(); onClick(appt); }}
      className="event-block absolute rounded-lg text-left px-2 py-1.5 overflow-hidden shadow-sm border-l-[3px] bg-white"
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeftColor: color,
        backgroundColor: `${color}18`,
      }}
      title={`${appt.title} — ${owner?.name || ""}`}
    >
      <div className="text-[11px] font-bold truncate leading-tight" style={{ color: shadeColor(color, -30) }}>
        {appt.title}
      </div>
      <div className="text-[10px] text-slate-600 leading-tight">
        {appt.start_time}–{appt.end_time}
      </div>
      {appt.location && (
        <div className="text-[10px] text-slate-500 truncate leading-tight flex items-center gap-0.5">
          <MapPin className="w-2.5 h-2.5" /> {appt.location}
        </div>
      )}
      <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
        {owner?.name || "—"}
      </div>
    </button>
  );
}

function shadeColor(hex, percent) {
  // basic darken
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

// Layout events into lanes for a single day
function layoutDay(appts) {
  const sorted = [...appts].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const lanes = []; // each lane holds { endTime }
  const placement = new Map();
  for (const a of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] <= a.start_time) {
        lanes[i] = a.end_time;
        placement.set(a.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push(a.end_time);
      placement.set(a.id, lanes.length - 1);
    }
  }
  return { placement, totalLanes: Math.max(1, lanes.length) };
}

export default function WeekCalendar({
  weekStart,
  appointments,
  users,
  onSlotClick,
  onEventClick,
  currentUserId,
  isAdmin,
  mobileDayIndex,
  onChangeMobileDay,
}) {
  const userMap = React.useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const today = new Date();

  // Group appointments by day-of-week (0..4)
  const byDay = React.useMemo(() => {
    const grouped = [[], [], [], [], []];
    for (const a of appointments) {
      const d = new Date(a.date + "T00:00:00");
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0..Sun=6
      if (dayIdx < 5) grouped[dayIdx].push(a);
    }
    return grouped;
  }, [appointments]);

  const dayLayouts = React.useMemo(() => byDay.map(layoutDay), [byDay]);

  const renderDayColumn = (dayIdx, mobile = false) => {
    const dayDate = addDays(weekStart, dayIdx);
    const isToday = isSameDay(dayDate, today);
    const { placement, totalLanes } = dayLayouts[dayIdx];

    return (
      <div key={dayIdx} className="relative border-l border-slate-100" style={{ height: HOURS.length * 60 }}>
        {/* Hour cells (background) */}
        {HOURS.map((h) => (
          <div
            key={h}
            data-testid={`slot-${toISODate(dayDate)}-${String(h).padStart(2, "0")}`}
            onClick={() => onSlotClick(dayDate, h)}
            className="time-slot absolute left-0 right-0 border-b border-slate-100"
            style={{ top: (h - 7) * 60, height: 60 }}
          />
        ))}
        {isToday && (
          <div className="absolute inset-x-0 top-0 h-1 bg-sky-400/60 pointer-events-none" />
        )}
        {/* Events */}
        {byDay[dayIdx].map((a) => (
          <EventBlock
            key={a.id}
            appt={a}
            owner={userMap[a.user_id]}
            canEdit={isAdmin || a.user_id === currentUserId}
            onClick={onEventClick}
            laneIndex={placement.get(a.id) || 0}
            lanes={totalLanes}
          />
        ))}
      </div>
    );
  };

  // Mobile: single day view
  const mobileDate = addDays(weekStart, mobileDayIndex);

  return (
    <div className="flex-1">
      {/* Desktop week view */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: "64px repeat(5, minmax(0,1fr))" }}>
          <div className="border-b border-slate-200 bg-slate-50/50" />
          {WEEKDAYS.map((label, i) => {
            const d = addDays(weekStart, i);
            const isToday = isSameDay(d, today);
            return (
              <div
                key={i}
                className={`px-3 py-3 border-b border-l border-slate-200 text-center ${isToday ? "bg-sky-50" : "bg-white"}`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-sky-700" : "text-slate-500"}`}>
                  {WEEKDAYS_SHORT[i]}
                </div>
                <div className={`text-lg font-heading font-black ${isToday ? "text-sky-700" : "text-slate-900"}`}>
                  {d.getDate().toString().padStart(2, "0")}
                </div>
              </div>
            );
          })}
        </div>
        {/* Grid body */}
        <div className="grid" style={{ gridTemplateColumns: "64px repeat(5, minmax(0,1fr))" }}>
          {/* Time labels column */}
          <div className="bg-slate-50/50" style={{ height: HOURS.length * 60 }}>
            {HOURS.map((h) => (
              <div key={h} className="h-[60px] px-2 pt-1 text-[11px] font-semibold text-slate-400 text-right border-b border-slate-100">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((d) => renderDayColumn(d))}
        </div>
      </div>

      {/* Mobile day view */}
      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-thin">
          {WEEKDAYS.map((label, i) => {
            const d = addDays(weekStart, i);
            const isSel = i === mobileDayIndex;
            const isToday = isSameDay(d, today);
            return (
              <button
                key={i}
                data-testid={`mobile-day-${i}`}
                onClick={() => onChangeMobileDay(i)}
                className={`shrink-0 px-3 py-2 rounded-xl border transition-colors ${
                  isSel ? "bg-sky-500 border-sky-500 text-white" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{WEEKDAYS_SHORT[i]}</div>
                <div className="text-base font-heading font-black">{d.getDate().toString().padStart(2, "0")}</div>
                {isToday && !isSel && <div className="text-[9px] text-sky-600 font-semibold mt-0.5">Hoje</div>}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: "56px 1fr" }}>
            <div className="bg-slate-50/50" style={{ height: HOURS.length * 60 }}>
              {HOURS.map((h) => (
                <div key={h} className="h-[60px] px-2 pt-1 text-[11px] font-semibold text-slate-400 text-right border-b border-slate-100">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {renderDayColumn(mobileDayIndex, true)}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, Settings, Menu } from "lucide-react";
import { formatRangeBR, addDays } from "@/lib/dateUtils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header({ weekStart, onPrev, onNext, onToday, onOpenSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const weekEnd = addDays(weekStart, 4);

  const initials = user?.name?.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            data-testid="btn-open-sidebar"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-md shadow-sky-200">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-heading font-black text-sm text-slate-900">Agenda</div>
              <div className="font-heading font-black text-sm text-sky-600 -mt-0.5">Colaborativa</div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            data-testid="btn-week-prev"
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className="rounded-full hover:bg-slate-100"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            data-testid="btn-week-today"
            variant="outline"
            onClick={onToday}
            className="rounded-full h-9 px-4 border-slate-200 hover:bg-slate-50 font-semibold"
          >
            Hoje
          </Button>
          <Button
            data-testid="btn-week-next"
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="rounded-full hover:bg-slate-100"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div data-testid="week-range" className="hidden md:block ml-3 text-sm font-semibold text-slate-700 whitespace-nowrap">
            {formatRangeBR(weekStart, weekEnd)}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="user-menu-trigger" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors">
              <Avatar className="w-8 h-8 border-2" style={{ borderColor: user?.color || "#0ea5e9" }}>
                <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: user?.color || "#0ea5e9", color: "#fff" }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</div>
                <div className="text-xs text-slate-500 leading-tight">{user?.role === "admin" ? "Administrador" : "Usuário"}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-semibold">{user?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "admin" && (
              <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" /> Administração
              </DropdownMenuItem>
            )}
            <DropdownMenuItem data-testid="menu-logout" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div data-testid="week-range-mobile" className="md:hidden px-4 pb-3 text-sm font-semibold text-slate-700">
        {formatRangeBR(weekStart, weekEnd)}
      </div>
    </header>
  );
}

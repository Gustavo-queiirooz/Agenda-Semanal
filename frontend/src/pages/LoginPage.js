import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Bem-vindo(a) de volta!");
      navigate("/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-200">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-heading font-black text-xl text-slate-900 leading-tight">Agenda</div>
              <div className="font-heading font-black text-xl text-sky-600 leading-tight -mt-1">Colaborativa</div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-black text-slate-900 tracking-tight mb-2">
            Bem-vindo(a) de volta
          </h1>
          <p className="text-slate-500 mb-8">
            Entre com suas credenciais escolares para acessar a agenda da equipe.
          </p>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">E-mail</Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@agenda.local"
                className="h-12 rounded-xl border-slate-200 focus-visible:ring-sky-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Senha</Label>
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl border-slate-200 focus-visible:ring-sky-500"
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold text-base shadow-lg shadow-sky-200 hover:shadow-sky-300 transition-colors"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : "Entrar"}
            </Button>
          </form>

      </div>

      {/* Right: image */}
      <div
        className="hidden lg:block relative bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1760351561007-526f5353cc76?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHwxfHx0ZWFjaGVycyUyMHdvcmtpbmclMjB0b2dldGhlciUyMG1vZGVybiUyMHNjaG9vbHxlbnwwfHx8fDE3ODcwNzIyNTB8MA&ixlib=rb-4.1.0&q=85')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-900/70 via-sky-700/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wide mb-6">
              Para equipes escolares
            </div>
            <h2 className="text-3xl xl:text-4xl font-heading font-black leading-tight mb-3">
              Organize a semana da sua equipe em um só lugar.
            </h2>
            <p className="text-white/80 text-base">
              Todos veem os horários uns dos outros — cada pessoa gerencia apenas os próprios compromissos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

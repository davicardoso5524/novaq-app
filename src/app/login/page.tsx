"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("E-mail ou senha inválidos.");
      setIsLoading(false);
      return;
    }

    window.location.assign("/painel");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-md sm:p-9"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Painel Novaq
        </p>
        <h1 id="login-title" className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Entre na sua conta
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Gerencie sua loja, equipe e aparência em um só lugar.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-describedby={error ? "login-error" : undefined}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
              className="min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-base text-white placeholder:text-white/35 disabled:cursor-wait disabled:opacity-70"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-white">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              className="min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 text-base text-white disabled:cursor-wait disabled:opacity-70"
            />
          </div>

          <p
            id="login-error"
            role="alert"
            aria-live="polite"
            className={`min-h-6 text-sm text-red-300 ${error ? "visible" : "invisible"}`}
          >
            {error || "Sem erros"}
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 font-semibold text-[#032318] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

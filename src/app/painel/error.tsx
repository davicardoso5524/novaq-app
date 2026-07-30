"use client";

export default function PanelError({ reset }: { error: Error; reset(): void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7fc] px-6 text-slate-900">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Não foi possível carregar o painel</h1>
        <p className="mt-3 text-slate-600">Verifique sua conexão ou tente novamente. Se sua sessão expirou, entre novamente.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-violet-700 px-5 font-semibold text-white hover:bg-violet-800">Tentar novamente</button>
      </section>
    </main>
  );
}

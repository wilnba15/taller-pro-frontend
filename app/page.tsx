import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold mb-3">Taller PRO</h1>
        <p className="text-slate-300 mb-6">
          Panel base conectado al backend staging.
        </p>

        <div className="flex gap-3">
          <Link
            href="/dashboard/clients"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
          >
            Ir a Clientes
          </Link>
        </div>
      </div>
    </main>
  );
}
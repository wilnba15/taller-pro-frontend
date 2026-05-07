import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-4xl font-bold mb-3">SIADAUTO</h1>
        <p className="text-slate-300 mb-6">
          Sistema para la administración de talleres automotrices.
        </p>

        <Link
          href="/login"
          className="inline-flex px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-semibold"
        >
          Ingresar al sistema
        </Link>
      </div>
    </main>
  );
}

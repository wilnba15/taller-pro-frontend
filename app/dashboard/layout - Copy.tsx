import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-6">Taller PRO</h2>

        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/dashboard" className="hover:text-blue-400">
            Dashboard
          </Link>
          <Link href="/dashboard/clients" className="hover:text-blue-400">
            Clientes
          </Link>
          <Link href="/dashboard/vehicles" className="hover:text-blue-400">
            Vehículos
          </Link>
          <Link href="/dashboard/work-orders" className="hover:text-blue-400">
            Órdenes
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
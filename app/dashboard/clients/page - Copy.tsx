import Link from "next/link";

type Client = {
  id: number;
  workshop_id: number;
  full_name: string;
  identification: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
};

async function getClients(): Promise<Client[]> {
  const api = process.env.NEXT_PUBLIC_API_BASE;

  if (!api) {
    throw new Error("Falta NEXT_PUBLIC_API_BASE en las variables de entorno");
  }

  const res = await fetch(`${api}/clients/`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudieron cargar los clientes: ${res.status} ${text}`);
  }

  return res.json();
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-slate-400 mt-1">
              Listado de clientes desde backend staging.
            </p>
          </div>

          <Link
            href="/dashboard/clients/new"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
          >
            + Nuevo cliente
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/70 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Identificación</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Dirección</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No hay clientes registrados.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">{client.full_name}</td>
                    <td className="px-4 py-3">{client.identification}</td>
                    <td className="px-4 py-3">{client.phone}</td>
                    <td className="px-4 py-3">{client.email || "-"}</td>
                    <td className="px-4 py-3">{client.address || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

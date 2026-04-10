async function getClients() {
  const api = process.env.NEXT_PUBLIC_API_BASE;

  const res = await fetch(`${api}/clients/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudieron cargar los clientes");
  }

  return res.json();
}

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

export default async function ClientsPage() {
  const clients: Client[] = await getClients();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-slate-400 mt-1">
            Listado de clientes desde backend staging.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/70 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Workshop</th>
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
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No hay clientes registrados.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">{client.id}</td>
                    <td className="px-4 py-3">{client.workshop_id}</td>
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
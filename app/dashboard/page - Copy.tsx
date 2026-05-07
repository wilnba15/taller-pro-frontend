type Client = {
  id: number;
};

type Vehicle = {
  id: number;
};

type WorkOrder = {
  id: number;
  status: string;
  total: string | number;
  created_at?: string;
};

async function getClients() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const res = await fetch(`${api}/clients/`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("No se pudieron cargar los clientes");
  }

  return res.json();
}

async function getVehicles() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const res = await fetch(`${api}/vehicles/`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("No se pudieron cargar los vehículos");
  }

  return res.json();
}

async function getWorkOrders() {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  const res = await fetch(`${api}/work-orders/`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("No se pudieron cargar las órdenes");
  }

  return res.json();
}

function formatMoney(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(num || 0);
}

export default async function DashboardPage() {
  const [clients, vehicles, workOrders]: [Client[], Vehicle[], WorkOrder[]] =
    await Promise.all([getClients(), getVehicles(), getWorkOrders()]);

  const totalClients = clients.length;
  const totalVehicles = vehicles.length;
  const totalWorkOrders = workOrders.length;
  const pendingOrders = workOrders.filter(
    (order) => order.status?.toLowerCase() === "pendiente"
  ).length;

  const totalSales = workOrders.reduce((acc, order) => {
    const num = typeof order.total === "string" ? Number(order.total) : order.total;
    return acc + (num || 0);
  }, 0);

  const recentOrders = [...workOrders]
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Resumen general del sistema Taller PRO conectado al backend staging.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Total clientes</p>
            <h2 className="text-3xl font-bold mt-2">{totalClients}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Total vehículos</p>
            <h2 className="text-3xl font-bold mt-2">{totalVehicles}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Órdenes de trabajo</p>
            <h2 className="text-3xl font-bold mt-2">{totalWorkOrders}</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Órdenes pendientes</p>
            <h2 className="text-3xl font-bold mt-2">{pendingOrders}</h2>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Órdenes recientes</h3>
              <span className="text-sm text-slate-400">
                Últimos {recentOrders.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-3 pr-4">ID</th>
                    <th className="text-left py-3 pr-4">Estado</th>
                    <th className="text-left py-3 pr-4">Total</th>
                    <th className="text-left py-3 pr-4">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-slate-400">
                        No hay órdenes recientes.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-800/70">
                        <td className="py-3 pr-4">{order.id}</td>
                        <td className="py-3 pr-4 capitalize">{order.status}</td>
                        <td className="py-3 pr-4 font-medium">
                          {formatMoney(order.total)}
                        </td>
                        <td className="py-3 pr-4">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("es-EC")
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Facturación estimada</h3>
            <p className="text-sm text-slate-400 mb-2">
              Suma de totales registrados en órdenes.
            </p>
            <div className="text-4xl font-bold mb-6">
              {formatMoney(totalSales)}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-slate-800/70 p-4">
                <p className="text-sm text-slate-400">Clientes registrados</p>
                <p className="text-2xl font-semibold mt-1">{totalClients}</p>
              </div>

              <div className="rounded-xl bg-slate-800/70 p-4">
                <p className="text-sm text-slate-400">Vehículos registrados</p>
                <p className="text-2xl font-semibold mt-1">{totalVehicles}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
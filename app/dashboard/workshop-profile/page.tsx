import WorkshopProfileForm from "@/components/WorkshopProfileForm";

export default function WorkshopProfilePage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-400">Configuración</p>
          <h1 className="text-3xl font-bold md:text-4xl">🏢 Perfil del Taller</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Registra la información esencial que identifica al taller dentro de SIADAUTO y en los documentos generados por el sistema.
          </p>
        </div>

        <WorkshopProfileForm />
      </div>
    </main>
  );
}

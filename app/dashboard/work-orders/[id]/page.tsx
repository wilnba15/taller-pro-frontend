"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkOrderDetailRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const orderId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  useEffect(() => {
    if (orderId) {
      router.replace(`/dashboard/work-orders/${orderId}/edit`);
    }
  }, [orderId, router]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      Redirigiendo a la edición de la orden...
    </main>
  );
}

import VehicleLifeTimeline from "@/components/VehicleLifeTimeline";

type PageProps = {
  params: { vehicleId: string };
  searchParams?: {
    plate?: string;
    brand?: string;
    model?: string;
    client?: string;
  };
};

export default function VidaDelAutoPage({ params, searchParams }: PageProps) {
  return (
    <VehicleLifeTimeline
      vehicleId={params.vehicleId}
      plate={searchParams?.plate}
      brand={searchParams?.brand}
      model={searchParams?.model}
      clientName={searchParams?.client}
    />
  );
}

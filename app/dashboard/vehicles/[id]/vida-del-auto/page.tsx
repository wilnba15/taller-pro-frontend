import VehicleLifeTimeline from "@/components/VehicleLifeTimeline";

type PageProps = {
  params: { id: string };
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
      vehicleId={params.id}
      plate={searchParams?.plate}
      brand={searchParams?.brand}
      model={searchParams?.model}
      clientName={searchParams?.client}
    />
  );
}

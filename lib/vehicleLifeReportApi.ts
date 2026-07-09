import { apiFetch } from "@/lib/api";

export type VehicleLifeItem = {
  work_order_id: number;
  work_order_date?: string | null;
  current_km?: number | null;
  status?: string | null;
  item_id: number;
  item_type?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
  next_service_km?: number | null;
  next_service_date?: string | null;
  reminder_enabled?: boolean;
  reminder_sent?: boolean;
};

export type VehicleLifeReport = {
  vehicle_id: number;
  total_events: number;
  total_invested: number;
  last_km?: number | null;
  items: VehicleLifeItem[];
  next_services: VehicleLifeItem[];
};

export async function getVehicleLifeReport(vehicleId: number | string) {
  return apiFetch<VehicleLifeReport>(`/api/vehicle-life/vehicle/${vehicleId}`);
}

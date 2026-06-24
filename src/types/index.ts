export interface DetectionEvent {
  event_id: string;
  camera_id: string;
  camera_name?: string;
  camera_location: string;
  captured_at: string; // ISO 8601 string

  anpr_text: string;
  plate_confidence_mode: number; // 0 = preliminary, 1 = full ANPR
  country_long?: string;
  country_short?: string;
  state_long?: string;
  state_short?: string;

  vehicle_image_url: string;
  plate_image_url: string;
  overview_image_url?: string | null;

  vehicle_category?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_submodel?: string | null;
  vehicle_colour?: string;

  direction: 'IN' | 'OUT' | 'UNKNOWN';
  speed_kmh?: number | null;
  gps_lat?: number | null;
  gps_lng?: number | null;

  status: 'SCANNED' | 'ACTIONED' | 'CLEARED';
  enforcement_status?: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'DISPUTED' | null;
  officer_id?: string | null;
  notes?: string | null;
  corrected_plate_text?: string | null;
}

export interface SummaryMetrics {
  total_scanned: number;
  total_fined: number;
  total_disputed: number;
  total_clamped: number;
  total_towed: number;
  total_impounded: number;
  total_bookings: number;
  total_booking_hours: number;
  total_revenue: number;
  currency: string;
  period?: {
    from: string;
    to: string;
  };
}

export interface Officer {
  officer_id: string;
  username: string;
  name: string;
  role: 'OFFICER' | 'SUPERVISOR' | 'ADMIN';
  badge_number?: string;
}

export interface Fine {
  fine_id: string;
  event_id: string;
  plate_number: string;
  offence_code: string;
  offence_description?: string;
  amount: number;
  issued_date: string;
  due_date: string;
  status: 'ISSUED' | 'PAID' | 'DISPUTED' | 'WAIVED' | 'OVERDUE';
  officer_id: string;
  notes?: string;
  dispute_reason?: string | null;
  dispute_date?: string | null;
  dispute_status?: 'PENDING' | 'RESOLVED_UPHELD' | 'RESOLVED_WAIVED' | null;
}

export interface Booking {
  booking_id: string;
  event_id?: string | null;
  plate_number: string;
  zone_id: string;
  bay_number: string;
  start_time: string;
  duration_hours: number;
  end_time: string;
  status: 'ACTIVE' | 'COMPLETED' | 'OVERSTAYED' | 'CANCELLED';
  revenue: number;
  officer_id: string;
  notes?: string;
}

export interface Camera {
  camera_id: string;
  camera_name: string;
  camera_location: string;
  status: 'ONLINE' | 'OFFLINE';
  last_heartbeat?: string;
  zone_assigned: string;
}

export interface Zone {
  zone_id: string;
  zone_name: string;
  description?: string;
}

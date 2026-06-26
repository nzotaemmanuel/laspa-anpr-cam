import type { DetectionEvent, SummaryMetrics, Fine, Booking, Camera, Zone, Officer } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app') ? '' : 'http://98.94.86.116');
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://98.94.86.116';

// ---------------------------------------------------------------------------
// Raw payload type returned by /api/logs
// ---------------------------------------------------------------------------
interface RawWebhookFile {
  s3_url: string;
  s3_key: string;
  filename: string;
  field: string;       // 'image' | 'plate' | ...
  content_type: string;
}

interface RawAnprResult {
  ID: string;
  cameraid: string;
  location?: string;
  image_hash?: string;
  anpr?: {
    text: string;
    confidence: string;
    resultcnt?: string;
    bgcolor?: string;
    color?: string;
    type?: string;
    opt_speed?: string;
    frame?: string;
    timems?: string;
    country?: string;
    state?: string;
  } | Array<{
    text: string;
    confidence: string;
    resultcnt?: string;
    bgcolor?: string;
    color?: string;
    type?: string;
    opt_speed?: string;
    frame?: string;
    timems?: string;
    country?: string;
    state?: string;
  }>;
  mmr?: {
    make?: string;
    model?: string;
    submodel?: string;
    color?: string;
    category?: string;
    color_conf?: string;
    model_conf?: string;
    category_conf?: string;
  };
  country?: {
    country_short?: string;
    country_long?: string;
    state_short?: string;
    state_long?: string;
  };
  trigger?: {
    direction?: string;   // '0'=unknown '1'=in '2'=out
    speed?: string;
    speed_limit?: string;
    vclass?: string;
    category?: string;
    data?: string;
    timems?: string;
  };
  misc?: {
    gps_lat?: string;
    gps_lon?: string;
  };
  capture?: {
    frametime?: string;   // e.g. "20260618T133530+0100"
    frametimems?: string;
    frameindex?: string;
  };
  motdet?: {
    rect?: string;
    objectix?: string;
    objectid?: string;
    confidence?: string;
  };
}

interface RawWebhookLog {
  timestamp: string;
  source?: string;
  path?: string;
  method?: string;
  url?: string;
  user_agent?: string;
  remote_addr?: string;
  content_type?: string | null;
  content_length?: number | null;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  query_string?: string;
  files?: RawWebhookFile[];
  form_data?: Record<string, string> | null;
  raw_data?: string | null;
  json_data?: { result?: RawAnprResult } | null;
}

// ---------------------------------------------------------------------------
// Correlation & Aggregation types
// ---------------------------------------------------------------------------
interface CorrelatedEvent {
  correlationId: string;
  timestamp: string;
  eventDataUrl?: string;
  vehicleImageUrl?: string;
  plateImageUrl?: string;
  jsonData?: RawAnprResult;
}

const eventJsonCache = new Map<string, RawAnprResult>();

// ---------------------------------------------------------------------------
// Adapter helpers
// ---------------------------------------------------------------------------

/**
 * Extract correlation ID from filename (e.g. "1728560119307.xml" -> "1728560119307")
 */
function getCorrelationId(filename: string): string | null {
  const match = filename.match(/(\d+)\.(xml|json)/i);
  return match ? match[1] : null;
}

/**
 * Ensure any ISO timestamp from the backend that lacks an explicit offset
 * is treated as UTC (ends with 'Z').
 */
function ensureUtcTimestamp(timestamp: string): string {
  if (!timestamp) return new Date().toISOString();
  const trimmed = timestamp.trim();
  if (!/[zZ]$/.test(trimmed) && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
}

/**
 * Convert the camera's frametime string ("20260618T133530+0100")
 * to a proper ISO 8601 string.  Falls back to the log's own timestamp.
 */
function parseFrameTime(frametime?: string, fallback?: string): string {
  const fallbackUtc = fallback ? ensureUtcTimestamp(fallback) : new Date().toISOString();
  if (!frametime) return fallbackUtc;
  try {
    // Format: YYYYMMDDTHHmmss±HHMM  →  YYYY-MM-DDTHH:mm:ss±HH:MM
    const match = frametime.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4})$/
    );
    if (match) {
      const [, yr, mo, dy, hh, mm, ss, tz] = match;
      const tzFmt = `${tz.slice(0, 3)}:${tz.slice(3)}`;
      return new Date(`${yr}-${mo}-${dy}T${hh}:${mm}:${ss}${tzFmt}`).toISOString();
    }
    // Already parseable?
    const cleanFrametime = ensureUtcTimestamp(frametime);
    const d = new Date(cleanFrametime);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return fallbackUtc;
}

/** Map the camera's direction code to the app's union literal. */
function mapDirection(code?: string): 'IN' | 'OUT' | 'UNKNOWN' {
  switch (code) {
    case '1': return 'IN';
    case '2': return 'OUT';
    default:  return 'UNKNOWN';
  }
}

/**
 * Decodes unicode escape sequences and HTML/XML entities in plate text
 */
function decodePlateText(text: string): string {
  if (!text) return '';
  
  let decoded = text;
  
  // 1. Decode Unicode escapes (both literal \\uXXXX and regular if needed)
  if (decoded.includes('\\u') || decoded.includes('%')) {
    try {
      // Decode % escapes (e.g. urlencoded) if any
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }
      // Decode literal \\uXXXX
      decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    } catch (e) {
      console.warn('Unicode/URI decoding failed:', e);
    }
  }
  
  // 2. Decode HTML/XML hexadecimal entities like &#x0045;
  if (decoded.includes('&#x')) {
    try {
      decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    } catch (e) {
      console.warn('HTML hex decoding failed:', e);
    }
  }

  // 3. Decode HTML/XML decimal entities like &#69;
  if (decoded.includes('&#')) {
    try {
      decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
      });
    } catch (e) {
      console.warn('HTML decimal decoding failed:', e);
    }
  }
  
  return decoded;
}

/**
 * Transform a correlated group of webhook logs into a single DetectionEvent.
 */
function adaptCorrelatedToDetectionEvent(entry: CorrelatedEvent): DetectionEvent {
  const result = entry.jsonData;

  const capturedAt = ensureUtcTimestamp(
    result?.capture?.frametime
      ? parseFrameTime(result.capture.frametime, entry.timestamp)
      : entry.timestamp
  );

  const cameraId = result?.cameraid ?? 'UNKNOWN';
  const cameraName = cameraId.split('/')[0]; // e.g. "FXS_CM_FE_01191574A"

  // Extract ANPR text and confidence, handling both object and array forms
  let rawText = '';
  let confidenceVal = 0;

  if (result?.anpr) {
    const anprData = result.anpr;
    if (Array.isArray(anprData)) {
      if (anprData.length > 0) {
        rawText = anprData[0]?.text ?? '';
        confidenceVal = parseInt(anprData[0]?.confidence ?? '0', 10);
      }
    } else {
      rawText = anprData.text ?? '';
      confidenceVal = parseInt(anprData.confidence ?? '0', 10);
    }
  }

  // Treat "n.a." / empty string as an empty plate, and decode any character escape formatting
  const anprText = decodePlateText(rawText).replace(/^n\.a\.$/i, '');

  return {
    event_id:              entry.correlationId,
    camera_id:             cameraId,
    camera_name:           cameraName,
    camera_location:       result?.location ?? cameraName,
    captured_at:           capturedAt,

    anpr_text:             anprText,
    plate_confidence_mode: confidenceVal,
    country_short:         result?.country?.country_short  || undefined,
    country_long:          result?.country?.country_long   || undefined,
    state_short:           result?.country?.state_short    || undefined,
    state_long:            result?.country?.state_long     || undefined,

    vehicle_image_url:     entry.vehicleImageUrl ?? entry.plateImageUrl ?? '',
    plate_image_url:       entry.plateImageUrl ?? entry.vehicleImageUrl ?? '',
    overview_image_url:    null,

    vehicle_category:      result?.mmr?.category  || undefined,
    vehicle_make:          result?.mmr?.make       || undefined,
    vehicle_model:         result?.mmr?.model      || undefined,
    vehicle_submodel:      result?.mmr?.submodel   || null,
    vehicle_colour:        result?.mmr?.color      || undefined,

    direction:             mapDirection(result?.trigger?.direction),
    speed_kmh:             result?.trigger?.speed ? parseFloat(result.trigger.speed) : null,
    gps_lat:               result?.misc?.gps_lat ? parseFloat(result.misc.gps_lat) : null,
    gps_lng:               result?.misc?.gps_lon ? parseFloat(result.misc.gps_lon) : null,

    status:                'SCANNED',
    enforcement_status:    null,
    officer_id:            null,
    notes:                 null,
    corrected_plate_text:  null,
  };
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Session expired or unauthorized
      window.dispatchEvent(new CustomEvent('auth-expired'));
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: Officer }> {
    try {
      return await this.request<{ token: string; user: Officer }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    } catch (e) {
      console.warn('Backend login route failed, using mock auth session');
      throw e;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout route failed');
    }
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.request<{ token: string }>('/api/v1/auth/refresh', { method: 'POST' });
  }

  // Helper to fetch, adapt, merge localStorage overlays, and filter logs from /api/logs
  private async getFilteredLogs(params: {
    plate?: string;
    from?: string;
    to?: string;
    zone?: string[];
    status?: string[];
  }): Promise<DetectionEvent[]> {
    try {
      // The endpoint returns raw webhook logs; adapt them to DetectionEvent first
      const rawLogs = await this.request<RawWebhookLog[]>('/api/logs');
      
      const eventMap = new Map<string, CorrelatedEvent>();

      for (const log of rawLogs) {
        let corrId: string | null = null;
        
        if (log.json_data?.result?.ID) {
          corrId = log.json_data.result.ID;
        }

        if (log.files && log.files.length > 0) {
          for (const file of log.files) {
            const fileCorrId = getCorrelationId(file.filename);
            if (fileCorrId) {
              corrId = fileCorrId;
              let entry = eventMap.get(corrId);
              if (!entry) {
                entry = { correlationId: corrId, timestamp: log.timestamp };
                eventMap.set(corrId, entry);
              }
              
              const filenameLower = file.filename.toLowerCase();
              if (file.field === 'event_data' || filenameLower.endsWith('.xml') || filenameLower.endsWith('.json')) {
                entry.eventDataUrl = file.s3_url;
              } else if (file.field === 'image' || filenameLower.endsWith('.jpg') || filenameLower.endsWith('.jpeg')) {
                if (filenameLower.includes('plate')) {
                  entry.plateImageUrl = file.s3_url;
                } else {
                  entry.vehicleImageUrl = file.s3_url;
                }
              }
            }
          }
        }

        if (corrId && log.json_data?.result) {
          let entry = eventMap.get(corrId);
          if (!entry) {
            entry = { correlationId: corrId, timestamp: log.timestamp };
            eventMap.set(corrId, entry);
          }
          entry.jsonData = log.json_data.result;
        }
      }

      // Fetch event_data JSONs in parallel
      const fetchPromises = Array.from(eventMap.values()).map(async (entry) => {
        if (entry.jsonData) return;

        if (eventJsonCache.has(entry.correlationId)) {
          entry.jsonData = eventJsonCache.get(entry.correlationId);
          return;
        }

        if (entry.eventDataUrl) {
          try {
            // Rewrite S3 URL to use local dev server proxy to bypass CORS
            const targetUrl = entry.eventDataUrl.startsWith('https://microcam-alpr-images-808715036111.s3.amazonaws.com/')
              ? entry.eventDataUrl.replace('https://microcam-alpr-images-808715036111.s3.amazonaws.com/', '/s3-proxy/')
              : entry.eventDataUrl;

            const res = await fetch(targetUrl);
            if (res.ok) {
              const data = await res.json();
              if (data && data.result) {
                entry.jsonData = data.result;
                eventJsonCache.set(entry.correlationId, data.result);
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch event_data JSON for ID ${entry.correlationId}:`, err);
          }
        }
      });

      await Promise.all(fetchPromises);

      const adapted = Array.from(eventMap.values())
        .map(adaptCorrelatedToDetectionEvent);

      const savedUpdates = localStorage.getItem('anpr_local_updates');
      const updates = savedUpdates ? JSON.parse(savedUpdates) : {};

      const mergedLogs = adapted.map(log => {
        if (updates[log.event_id]) {
          return { ...log, ...updates[log.event_id] };
        }
        return log;
      });

      let filtered = [...mergedLogs];

      // Filter out specific test plates requested by the user
      const HIDDEN_TEST_PLATES = ['agl 431ds', 'eky 850hx'];
      filtered = filtered.filter(e => !e.anpr_text || !HIDDEN_TEST_PLATES.includes(e.anpr_text.toLowerCase()));

      // Filter out every event data that has location as 'UNKNOWN'
      filtered = filtered.filter(e => e.camera_location && e.camera_location.trim().toUpperCase() !== 'UNKNOWN');

      // Sort by captured_at descending by default so new events are at the top
      filtered.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());

      if (params.plate) {
        const search = params.plate.toLowerCase();
        filtered = filtered.filter(e => e.anpr_text?.toLowerCase().includes(search));
      }
      if (params.from) {
        const fromTime = new Date(params.from).getTime();
        filtered = filtered.filter(e => new Date(e.captured_at).getTime() >= fromTime);
      }
      if (params.to) {
        const toDateStr = params.to.includes('T') ? params.to : `${params.to}T23:59:59.999Z`;
        const toTime = new Date(toDateStr).getTime();
        filtered = filtered.filter(e => new Date(e.captured_at).getTime() <= toTime);
      }
      if (params.zone && params.zone.length > 0) {
        filtered = filtered.filter(e => 
          params.zone!.some(z => 
            e.camera_name?.toLowerCase().includes(z.toLowerCase()) || 
            e.camera_location?.toLowerCase().includes(z.toLowerCase()) ||
            e.camera_id?.toLowerCase().includes(z.toLowerCase())
          )
        );
      }
      if (params.status && params.status.length > 0) {
        filtered = filtered.filter(e => 
          params.status!.includes(e.status) || 
          (e.enforcement_status && params.status!.includes(e.enforcement_status))
        );
      }
      return filtered;
    } catch (e) {
      console.error('Failed to fetch/filter logs from API', e);
      return [];
    }
  }

  // Summary Metrics - calculated dynamically from logs
  async getSummary(params: { from?: string; to?: string; zone?: string[]; camera_id?: string; officer_id?: string }): Promise<SummaryMetrics> {
    const logs = await this.getFilteredLogs({
      from: params.from,
      to: params.to,
      zone: params.zone,
    });

    const savedFines = localStorage.getItem('anpr_local_fines');
    const localFines: Fine[] = savedFines ? JSON.parse(savedFines) : [];
    
    const savedBookings = localStorage.getItem('anpr_local_bookings');
    const localBookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];

    const total_scanned = logs.length;
    const total_fined = logs.filter(l => l.enforcement_status === 'FINED').length;
    const total_clamped = logs.filter(l => l.enforcement_status === 'CLAMPED').length;
    const total_towed = logs.filter(l => l.enforcement_status === 'TOWED').length;
    const total_impounded = logs.filter(l => l.enforcement_status === 'IMPOUNDED').length;
    const total_bookings = localBookings.length;
    const total_booking_hours = localBookings.reduce((sum, b) => sum + b.duration_hours, 0);
    const bookings_revenue = localBookings.reduce((sum, b) => sum + b.revenue, 0);
    const fines_revenue = localFines.reduce((sum, f) => sum + f.amount, 0);
    const total_revenue = bookings_revenue + fines_revenue;
    const total_disputed = localFines.filter(f => f.status === 'DISPUTED').length;

    return {
      total_scanned,
      total_fined,
      total_disputed,
      total_clamped,
      total_towed,
      total_impounded,
      total_bookings,
      total_booking_hours,
      total_revenue,
      currency: 'NGN',
      period: {
        from: params.from || new Date().toISOString().split('T')[0],
        to: params.to || new Date().toISOString().split('T')[0]
      }
    };
  }

  // Vehicles Logs - paginated
  async getVehicles(params: {
    plate?: string;
    from?: string;
    to?: string;
    zone?: string[];
    status?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ items: DetectionEvent[]; total: number; page: number; pages: number }> {
    const filtered = await this.getFilteredLogs(params);
    const page = params.page || 1;
    const limit = params.limit || 50;
    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    
    return {
      items,
      total,
      page,
      pages
    };
  }

  async getVehicleById(id: string): Promise<DetectionEvent> {
    const logs = await this.getFilteredLogs({});
    const log = logs.find(l => l.event_id === id);
    if (!log) {
      throw new Error(`Vehicle event not found with ID: ${id}`);
    }
    return log;
  }

  async updateVehicle(id: string, updates: { corrected_plate_text?: string; officer_id: string; notes?: string }): Promise<DetectionEvent> {
    const savedUpdates = localStorage.getItem('anpr_local_updates');
    const localUpdates = savedUpdates ? JSON.parse(savedUpdates) : {};
    
    localUpdates[id] = {
      ...localUpdates[id],
      officer_id: updates.officer_id,
    };

    if (updates.corrected_plate_text !== undefined) {
      localUpdates[id].corrected_plate_text = updates.corrected_plate_text;
      localUpdates[id].anpr_text = updates.corrected_plate_text;
    }

    if (updates.notes !== undefined) {
      localUpdates[id].notes = updates.notes;
    }

    localStorage.setItem('anpr_local_updates', JSON.stringify(localUpdates));
    return this.getVehicleById(id);
  }

  async takeAction(
    id: string,
    actionData: {
      action: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED';
      officer_id: string;
      details: Record<string, any>;
    }
  ): Promise<DetectionEvent> {
    const savedUpdates = localStorage.getItem('anpr_local_updates');
    const localUpdates = savedUpdates ? JSON.parse(savedUpdates) : {};
    
    localUpdates[id] = {
      ...localUpdates[id],
      status: actionData.action === 'CLEARED' ? 'CLEARED' : 'ACTIONED',
      enforcement_status: actionData.action === 'CLEARED' ? null : actionData.action,
      officer_id: actionData.officer_id,
      notes: actionData.details.notes || ''
    };
    localStorage.setItem('anpr_local_updates', JSON.stringify(localUpdates));

    if (actionData.action === 'FINED') {
      const savedFines = localStorage.getItem('anpr_local_fines');
      const localFines: Fine[] = savedFines ? JSON.parse(savedFines) : [];
      const log = await this.getVehicleById(id);
      
      const newFine: Fine = {
        fine_id: `FINE-${Math.floor(100000 + Math.random() * 900000)}`,
        event_id: id,
        plate_number: log.corrected_plate_text || log.anpr_text,
        offence_code: actionData.details.offence_code || 'GEN-01',
        offence_description: actionData.details.offence_description || 'General traffic offence',
        amount: actionData.details.amount || 25000,
        issued_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ISSUED',
        officer_id: actionData.officer_id,
        notes: actionData.details.notes || ''
      };
      localFines.push(newFine);
      localStorage.setItem('anpr_local_fines', JSON.stringify(localFines));
    }
    
    if (actionData.action === 'BOOKED') {
      const savedBookings = localStorage.getItem('anpr_local_bookings');
      const localBookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];
      const log = await this.getVehicleById(id);
      const duration = actionData.details.duration_hours || 1;
      const hourlyRate = 500;
      
      const newBooking: Booking = {
        booking_id: `BKG-${Math.floor(100000 + Math.random() * 900000)}`,
        event_id: id,
        plate_number: log.corrected_plate_text || log.anpr_text,
        zone_id: 'zone.a',
        bay_number: actionData.details.bay_number || '01',
        start_time: new Date().toISOString(),
        duration_hours: duration,
        end_time: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        revenue: duration * hourlyRate,
        officer_id: actionData.officer_id,
        notes: actionData.details.notes || ''
      };
      localBookings.push(newBooking);
      localStorage.setItem('anpr_local_bookings', JSON.stringify(localBookings));
    }

    return this.getVehicleById(id);
  }

  // Fines
  async getFines(params: {
    plate?: string;
    status?: string[];
    from?: string;
    to?: string;
    offence?: string;
    officer?: string;
  }): Promise<Fine[]> {
    const savedFines = localStorage.getItem('anpr_local_fines');
    let fines: Fine[] = savedFines ? JSON.parse(savedFines) : [];

    if (params.plate) {
      const search = params.plate.toLowerCase();
      fines = fines.filter(f => f.plate_number.toLowerCase().includes(search));
    }
    if (params.status && params.status.length > 0) {
      fines = fines.filter(f => params.status!.includes(f.status));
    }
    if (params.from) {
      const fromTime = new Date(params.from).getTime();
      fines = fines.filter(f => new Date(f.issued_date).getTime() >= fromTime);
    }
    if (params.to) {
      const toTime = new Date(params.to).getTime();
      fines = fines.filter(f => new Date(f.issued_date).getTime() <= toTime);
    }
    return fines;
  }

  async getFineById(id: string): Promise<Fine> {
    const savedFines = localStorage.getItem('anpr_local_fines');
    const fines: Fine[] = savedFines ? JSON.parse(savedFines) : [];
    const fine = fines.find(f => f.fine_id === id);
    if (!fine) {
      throw new Error(`Fine not found with ID: ${id}`);
    }
    return fine;
  }

  async updateFine(
    id: string,
    updates: {
      status: 'ISSUED' | 'PAID' | 'DISPUTED' | 'WAIVED' | 'OVERDUE';
      dispute_reason?: string;
      dispute_status?: 'PENDING' | 'RESOLVED_UPHELD' | 'RESOLVED_WAIVED';
      notes?: string;
    }
  ): Promise<Fine> {
    const savedFines = localStorage.getItem('anpr_local_fines');
    const fines: Fine[] = savedFines ? JSON.parse(savedFines) : [];
    const index = fines.findIndex(f => f.fine_id === id);
    if (index === -1) {
      throw new Error(`Fine not found: ${id}`);
    }
    
    fines[index] = {
      ...fines[index],
      status: updates.status,
      dispute_reason: updates.dispute_reason ?? fines[index].dispute_reason,
      dispute_status: updates.dispute_status ?? fines[index].dispute_status,
      dispute_date: updates.status === 'DISPUTED' ? new Date().toISOString() : fines[index].dispute_date,
      notes: updates.notes ?? fines[index].notes
    };
    
    localStorage.setItem('anpr_local_fines', JSON.stringify(fines));
    return fines[index];
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const savedBookings = localStorage.getItem('anpr_local_bookings');
    return savedBookings ? JSON.parse(savedBookings) : [];
  }

  async createBooking(booking: Omit<Booking, 'booking_id' | 'status' | 'revenue'>): Promise<Booking> {
    const savedBookings = localStorage.getItem('anpr_local_bookings');
    const bookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];
    const hourlyRate = 500;
    
    const newBooking: Booking = {
      ...booking,
      booking_id: `BKG-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'ACTIVE',
      revenue: booking.duration_hours * hourlyRate,
      end_time: new Date(new Date(booking.start_time).getTime() + booking.duration_hours * 60 * 60 * 1000).toISOString()
    };
    
    bookings.push(newBooking);
    localStorage.setItem('anpr_local_bookings', JSON.stringify(bookings));
    return newBooking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const savedBookings = localStorage.getItem('anpr_local_bookings');
    const bookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];
    const index = bookings.findIndex(b => b.booking_id === id);
    if (index === -1) {
      throw new Error(`Booking not found: ${id}`);
    }
    
    bookings[index] = {
      ...bookings[index],
      ...updates
    } as Booking;
    
    localStorage.setItem('anpr_local_bookings', JSON.stringify(bookings));
    return bookings[index];
  }

  // Cameras & Zones
  async getCameras(): Promise<Camera[]> {
    return [
      {
        camera_id: 'ARH-MC-02-77A9',
        camera_name: 'Zone A - Main Entry',
        camera_location: 'Main Entrance Gate',
        status: 'ONLINE',
        last_heartbeat: new Date().toISOString(),
        zone_assigned: 'Zone A'
      },
      {
        camera_id: 'ARH-MC-02-77B2',
        camera_name: 'Zone B - Back Entry',
        camera_location: 'Back Gate Entrance',
        status: 'ONLINE',
        last_heartbeat: new Date().toISOString(),
        zone_assigned: 'Zone B'
      }
    ];
  }

  async getZones(): Promise<Zone[]> {
    return [
      { zone_id: 'zone.a', zone_name: 'Zone A', description: 'Main Commercial Core Zone' },
      { zone_id: 'zone.b', zone_name: 'Zone B', description: 'Northern Buffer Boundary' }
    ];
  }
}

export const api = new ApiService();

export class LiveFeedWebSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectInterval = 3000;
  private maxReconnectInterval = 30000;
  private currentInterval = 3000;
  private shouldReconnect = true;

  onOpen: () => void = () => {};
  onClose: (code: number, reason: string) => void = () => {};
  onError: (error: Event) => void = () => {};
  onMessage: (event: DetectionEvent) => void = () => {};
  onConnecting: () => void = () => {};

  constructor(endpoint: string = '/ws/live-feed') {
    this.url = `${WS_BASE_URL.replace('http', 'ws')}${endpoint}`;
  }

  connect() {
    this.shouldReconnect = true;
    this.onConnecting();

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.currentInterval = this.reconnectInterval; // reset backoff
        this.onOpen();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as DetectionEvent;
          this.onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message content', e);
        }
      };

      this.socket.onerror = (error) => {
        this.onError(error);
      };

      this.socket.onclose = (event) => {
        this.onClose(event.code, event.reason);
        if (this.shouldReconnect) {
          setTimeout(() => {
            console.log(`Reconnecting to WebSocket in ${this.currentInterval}ms...`);
            this.currentInterval = Math.min(this.currentInterval * 1.5, this.maxReconnectInterval);
            this.connect();
          }, this.currentInterval);
        }
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      if (this.shouldReconnect) {
        setTimeout(() => {
          this.connect();
        }, this.currentInterval);
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

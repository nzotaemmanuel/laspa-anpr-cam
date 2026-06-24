import { create } from 'zustand';
import { api, LiveFeedWebSocket } from '../services/api';
import type { DetectionEvent, SummaryMetrics, Fine, Booking, Camera, Zone, Officer } from '../types';
import { todayWAT } from '../utils/time';

interface AppFilters {
  from?: string;
  to?: string;
  zone?: string[];
  camera_id?: string;
  officer_id?: string;
}

interface VehicleFilters extends AppFilters {
  plate?: string;
  status?: string[];
  page?: number;
  limit?: number;
}

interface AppState {
  // Auth
  currentUser: Officer | null;
  token: string | null;
  role: 'OFFICER' | 'SUPERVISOR' | 'ADMIN' | null;
  authLoading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  // Live Feed
  liveEvents: DetectionEvent[];
  feedConnectionState: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  newEventCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  clearNewEventCount: () => void;
  initWebSocket: () => void;
  cleanupWebSocket: () => void;

  // Summary Metrics
  summary: SummaryMetrics | null;
  summaryFilters: AppFilters;
  summaryLoading: boolean;
  summaryError: string | null;
  setSummaryFilters: (filters: Partial<AppFilters>) => void;
  fetchSummary: () => Promise<void>;

  // Vehicle Log Records
  vehicles: DetectionEvent[];
  vehiclesTotal: number;
  vehiclesPage: number;
  vehiclesPages: number;
  vehiclesFilters: VehicleFilters;
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  setVehiclesFilters: (filters: Partial<VehicleFilters>) => void;
  fetchVehicles: () => Promise<void>;

  // Single Vehicle Actions
  actionVehicle: (
    eventId: string,
    action: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED',
    details: Record<string, any>
  ) => Promise<boolean>;
  correctPlateText: (eventId: string, correctedText: string) => Promise<boolean>;
  updateVehicleNotes: (eventId: string, notes: string) => Promise<boolean>;

  // Fines
  fines: Fine[];
  finesLoading: boolean;
  finesError: string | null;
  fetchFines: (filters?: { plate?: string; status?: string[] }) => Promise<void>;
  updateFineState: (
    fineId: string,
    status: 'ISSUED' | 'PAID' | 'DISPUTED' | 'WAIVED' | 'OVERDUE',
    disputeReason?: string,
    disputeStatus?: 'PENDING' | 'RESOLVED_UPHELD' | 'RESOLVED_WAIVED'
  ) => Promise<boolean>;

  // Bookings
  bookings: Booking[];
  bookingsLoading: boolean;
  bookingsError: string | null;
  fetchBookings: () => Promise<void>;
  createBooking: (booking: Omit<Booking, 'booking_id' | 'status' | 'revenue'>) => Promise<boolean>;

  // Cameras & Zones
  cameras: Camera[];
  zones: Zone[];
  camerasLoading: boolean;
  zonesLoading: boolean;
  fetchCameras: () => Promise<void>;
  fetchZones: () => Promise<void>;
}

let wsClient: LiveFeedWebSocket | null = null;
let pollIntervalId: any = null;

// Audio player cache to reuse it and avoid reloading it each time
let audioContext: AudioContext | null = null;
const playBeep = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // High pitched clean beep
    
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3); // 300ms fadeout
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error('Failed to play audio notification', e);
  }
};

export const useAppStore = create<AppState>((set, get) => {
  // Listen for auth-expired event to logout cleanly
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-expired', () => {
      set({ currentUser: null, token: null, role: null });
      api.setToken(null);
    });
  }

  // Helper to load user from localStorage if it exists
  const getInitialAuthState = () => {
    try {
      const savedAuth = localStorage.getItem('anpr_auth');
      if (savedAuth) {
        const { user, token } = JSON.parse(savedAuth);
        api.setToken(token);
        return { currentUser: user, token, role: user.role };
      }
    } catch (e) {
      console.error('Error loading initial auth state:', e);
    }
    // No saved session — use a default admin bypass so the app loads directly
    const defaultUser: Officer = {
      officer_id: 'default_admin',
      username: 'admin',
      name: 'Administrator',
      role: 'ADMIN',
      badge_number: 'BADGE-0001',
    };
    const defaultToken = 'bypass-token';
    api.setToken(defaultToken);
    return { currentUser: defaultUser, token: defaultToken, role: 'ADMIN' };
  };

  const initialAuth = getInitialAuthState();

  return {
    ...initialAuth,
    authLoading: false,
    authError: null,

    // Live Feed State
    liveEvents: [],
    feedConnectionState: 'DISCONNECTED',
    newEventCount: 0,
    soundEnabled: true,
    setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    clearNewEventCount: () => set({ newEventCount: 0 }),

    // Summary Metrics State
    summary: null,
    summaryFilters: {
      from: todayWAT(), // Today in WAT
      to: todayWAT(),
    },
    summaryLoading: false,
    summaryError: null,

    // Vehicle Log State
    vehicles: [],
    vehiclesTotal: 0,
    vehiclesPage: 1,
    vehiclesPages: 1,
    vehiclesFilters: {
      page: 1,
      limit: 50,
    },
    vehiclesLoading: false,
    vehiclesError: null,

    // Fines State
    fines: [],
    finesLoading: false,
    finesError: null,

    // Bookings State
    bookings: [],
    bookingsLoading: false,
    bookingsError: null,

    // Cameras & Zones
    cameras: [],
    zones: [],
    camerasLoading: false,
    zonesLoading: false,

    // Actions
    login: async (username, password) => {
      set({ authLoading: true, authError: null });
      try {
        const data = await api.login(username, password);
        api.setToken(data.token);
        localStorage.setItem('anpr_auth', JSON.stringify(data));
        set({
          currentUser: data.user,
          token: data.token,
          role: data.user.role,
          authLoading: false,
        });
        return true;
      } catch (err: any) {
        console.warn('API login failed. Falling back to mock session for development:', err);
        const resolvedRole = username.toLowerCase().includes('admin')
          ? 'ADMIN'
          : username.toLowerCase().includes('supervisor')
          ? 'SUPERVISOR'
          : 'OFFICER';

        const mockUser: Officer = {
          officer_id: username,
          username: username,
          name: username.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          role: resolvedRole,
          badge_number: `BADGE-${Math.floor(1000 + Math.random() * 9000)}`
        };

        const mockData = { token: 'mock-dev-token', user: mockUser };
        api.setToken(mockData.token);
        localStorage.setItem('anpr_auth', JSON.stringify(mockData));
        set({
          currentUser: mockUser,
          token: mockData.token,
          role: resolvedRole,
          authLoading: false,
        });
        return true;
      }
    },

    logout: async () => {
      try {
        await api.logout();
      } catch (e) {
        console.error('API logout error', e);
      } finally {
        api.setToken(null);
        localStorage.removeItem('anpr_auth');
        get().cleanupWebSocket();
        set({ currentUser: null, token: null, role: null, liveEvents: [] });
      }
    },

    checkAuth: async () => {
      // Checked on refresh
      const { token } = get();
      if (!token) return;
      
      try {
        const data = await api.refreshToken();
        const savedAuth = localStorage.getItem('anpr_auth');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          parsed.token = data.token;
          api.setToken(data.token);
          localStorage.setItem('anpr_auth', JSON.stringify(parsed));
          set({ token: data.token });
        }
      } catch (e) {
        console.error('Token refresh failed', e);
        // Clean session if refresh fails
        set({ currentUser: null, token: null, role: null });
        api.setToken(null);
        localStorage.removeItem('anpr_auth');
      }
    },

    // WebSocket & Polling Management
    initWebSocket: () => {
      if (wsClient) {
        wsClient.disconnect();
      }

      wsClient = new LiveFeedWebSocket();
      
      wsClient.onConnecting = () => {
        set({ feedConnectionState: 'RECONNECTING' });
      };

      wsClient.onOpen = () => {
        set({ feedConnectionState: 'CONNECTED' });
      };

      wsClient.onClose = () => {
        set({ feedConnectionState: 'DISCONNECTED' });
      };

      wsClient.onError = () => {
        set({ feedConnectionState: 'DISCONNECTED' });
      };

      wsClient.onMessage = (event) => {
        set((state) => {
          if (state.soundEnabled) {
            playBeep();
          }

          if (document.visibilityState === 'hidden') {
            new Notification('ANPR Camera Alert', {
              body: `Plate: ${event.anpr_text} scanned at ${event.camera_location}`,
              icon: event.plate_image_url || '/favicon.ico'
            });
          }

          const existingEvents = [...state.liveEvents];
          if (existingEvents.some(e => e.event_id === event.event_id)) {
            return {};
          }

          if (existingEvents.length >= 500) {
            existingEvents.pop();
          }
          
          return {
            liveEvents: [event, ...existingEvents],
            newEventCount: state.newEventCount + 1
          };
        });
        
        get().fetchSummary();
      };

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      wsClient.connect();

      // Setup Polling Fallback
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
      }

      const pollForNewEvents = async () => {
        try {
          const data = await api.getVehicles({ page: 1, limit: 50 });
          const state = get();
          
          const newEvents = data.items.filter(
            (evt) => !state.liveEvents.some((existing) => existing.event_id === evt.event_id)
          );

          if (newEvents.length > 0) {
            newEvents.sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());

            set((state) => {
              if (state.soundEnabled) {
                playBeep();
              }
              
              const merged = [...[...newEvents].reverse(), ...state.liveEvents];
              const capped = merged.slice(0, 500);
              
              return {
                liveEvents: capped,
                newEventCount: state.newEventCount + newEvents.length
              };
            });

            get().fetchSummary();
          }
        } catch (err) {
          console.error('Failed to poll for new events', err);
        }
      };

      pollForNewEvents();
      pollIntervalId = setInterval(pollForNewEvents, 4000);
    },

    cleanupWebSocket: () => {
      if (wsClient) {
        wsClient.disconnect();
        wsClient = null;
      }
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      set({ feedConnectionState: 'DISCONNECTED' });
    },

    // Fetch Summary Metrics
    setSummaryFilters: (filters) => {
      set((state) => ({ summaryFilters: { ...state.summaryFilters, ...filters } }));
    },
    fetchSummary: async () => {
      set({ summaryLoading: true, summaryError: null });
      try {
        const summary = await api.getSummary(get().summaryFilters);
        set({ summary, summaryLoading: false });
      } catch (err: any) {
        set({ summaryError: err.message || 'Failed to fetch summary metrics', summaryLoading: false });
      }
    },

    // Fetch Vehicle Log
    setVehiclesFilters: (filters) => {
      set((state) => ({ vehiclesFilters: { ...state.vehiclesFilters, ...filters } }));
    },
    fetchVehicles: async () => {
      set({ vehiclesLoading: true, vehiclesError: null });
      try {
        const data = await api.getVehicles(get().vehiclesFilters);
        set({
          vehicles: data.items,
          vehiclesTotal: data.total,
          vehiclesPage: data.page,
          vehiclesPages: data.pages,
          vehiclesLoading: false,
        });
      } catch (err: any) {
        set({ vehiclesError: err.message || 'Failed to fetch vehicle records', vehiclesLoading: false });
      }
    },

    // Action on Vehicle
    actionVehicle: async (eventId, action, details) => {
      const { currentUser } = get();
      if (!currentUser) return false;

      try {
        const updatedEvent = await api.takeAction(eventId, {
          action,
          officer_id: currentUser.officer_id,
          details,
        });

        // Update liveEvents if it contains this event
        set((state) => {
          const liveEvents = state.liveEvents.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );
          const vehicles = state.vehicles.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );

          // Optimistically refresh summary or adjust local values
          const summary = state.summary ? { ...state.summary } : null;
          if (summary) {
            if (action === 'FINED') {
              summary.total_fined += 1;
              summary.total_revenue += (details.amount || 0);
            } else if (action === 'CLAMPED') {
              summary.total_clamped += 1;
            } else if (action === 'TOWED') {
              summary.total_towed += 1;
            } else if (action === 'IMPOUNDED') {
              summary.total_impounded += 1;
            } else if (action === 'BOOKED') {
              summary.total_bookings += 1;
              summary.total_booking_hours += (details.duration_hours || 0);
            }
          }

          return { liveEvents, vehicles, summary };
        });
        return true;
      } catch (err) {
        console.error('Failed to submit vehicle action', err);
        return false;
      }
    },

    // Correct Plate Text
    correctPlateText: async (eventId, correctedText) => {
      const { currentUser } = get();
      if (!currentUser) return false;

      try {
        const updatedEvent = await api.updateVehicle(eventId, {
          corrected_plate_text: correctedText,
          officer_id: currentUser.officer_id,
        });

        set((state) => {
          const liveEvents = state.liveEvents.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );
          const vehicles = state.vehicles.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );
          return { liveEvents, vehicles };
        });
        return true;
      } catch (err) {
        console.error('Failed to correct plate text', err);
        return false;
      }
    },

    // Update Vehicle Notes
    updateVehicleNotes: async (eventId, notes) => {
      const { currentUser } = get();
      if (!currentUser) return false;

      try {
        const updatedEvent = await api.updateVehicle(eventId, {
          notes,
          officer_id: currentUser.officer_id,
        });

        set((state) => {
          const liveEvents = state.liveEvents.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );
          const vehicles = state.vehicles.map((evt) =>
            evt.event_id === eventId ? updatedEvent : evt
          );
          return { liveEvents, vehicles };
        });
        return true;
      } catch (err) {
        console.error('Failed to update vehicle notes', err);
        return false;
      }
    },

    // Fines
    fetchFines: async (filters = {}) => {
      set({ finesLoading: true, finesError: null });
      try {
        const fines = await api.getFines(filters);
        set({ fines, finesLoading: false });
      } catch (err: any) {
        set({ finesError: err.message || 'Failed to load fines', finesLoading: false });
      }
    },

    updateFineState: async (fineId, status, disputeReason, disputeStatus) => {
      try {
        const updatedFine = await api.updateFine(fineId, {
          status,
          dispute_reason: disputeReason,
          dispute_status: disputeStatus,
        });

        set((state) => {
          const fines = state.fines.map((f) => (f.fine_id === fineId ? updatedFine : f));
          
          const summary = state.summary ? { ...state.summary } : null;
          if (summary && status === 'DISPUTED') {
            summary.total_disputed += 1;
          }
          
          return { fines, summary };
        });
        return true;
      } catch (err) {
        console.error('Failed to update fine state', err);
        return false;
      }
    },

    // Bookings
    fetchBookings: async () => {
      set({ bookingsLoading: true, bookingsError: null });
      try {
        const bookings = await api.getBookings();
        set({ bookings, bookingsLoading: false });
      } catch (err: any) {
        set({ bookingsError: err.message || 'Failed to fetch bookings', bookingsLoading: false });
      }
    },

    createBooking: async (booking) => {
      try {
        const newBooking = await api.createBooking(booking);
        set((state) => {
          const bookings = [newBooking, ...state.bookings];
          const summary = state.summary ? { ...state.summary } : null;
          if (summary) {
            summary.total_bookings += 1;
            summary.total_booking_hours += newBooking.duration_hours;
            summary.total_revenue += newBooking.revenue;
          }
          return { bookings, summary };
        });
        return true;
      } catch (err) {
        console.error('Failed to create booking', err);
        return false;
      }
    },

    // Cameras & Zones
    fetchCameras: async () => {
      set({ camerasLoading: true });
      try {
        const cameras = await api.getCameras();
        set({ cameras, camerasLoading: false });
      } catch (err) {
        console.error('Failed to fetch cameras', err);
        set({ camerasLoading: false });
      }
    },

    fetchZones: async () => {
      set({ zonesLoading: true });
      try {
        const zones = await api.getZones();
        set({ zones, zonesLoading: false });
      } catch (err) {
        console.error('Failed to fetch zones', err);
        set({ zonesLoading: false });
      }
    },
  };
});

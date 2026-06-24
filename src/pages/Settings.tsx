import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { OFFENCE_CODES } from '../components/ActionModal';
import { 
  Video, Map, Users, ShieldAlert,
  Sliders, Link2, CheckCircle2, RefreshCw, Mail, Phone
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    currentUser, 
    cameras, 
    fetchCameras, 
    zones, 
    fetchZones,
    camerasLoading,
    zonesLoading
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'cameras' | 'zones' | 'users' | 'offences' | 'webhook'>('cameras');
  const webhookHeartbeat = 'ONLINE';
  const lastWebhookTime = new Date().toISOString();


  useEffect(() => {
    fetchCameras();
    fetchZones();
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <div className="bg-status-fined/10 border border-status-fined/25 text-status-fined p-6 rounded-2xl max-w-md shadow-lg flex flex-col items-center gap-4">
          <ShieldAlert className="w-12 h-12 text-status-fined stroke-1.5" />
          <h3 className="text-lg font-bold text-slate-100">Access Restricted</h3>
          <p className="text-xs text-text-muted leading-relaxed font-semibold">
            The Settings Panel is strictly restricted to Administration roles. Your current account profile ({currentUser?.name || 'Patrol Officer'}) has Officer / Supervisor clearance. Contact your system coordinator for permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 text-left">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            System Configuration Settings
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Configure patrol zones, manage enforcement roles, and monitor webhook metrics
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 border-b border-dark-border/30 pb-3">
        <button
          onClick={() => setActiveTab('cameras')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
            activeTab === 'cameras'
              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent font-bold'
              : 'border-dark-border hover:bg-slate-900 text-text-muted hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          Camera Feeds ({cameras.length})
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
            activeTab === 'zones'
              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent font-bold'
              : 'border-dark-border hover:bg-slate-900 text-text-muted hover:text-slate-200'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          Patrol Zones ({zones.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
            activeTab === 'users'
              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent font-bold'
              : 'border-dark-border hover:bg-slate-900 text-text-muted hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Officer Management
        </button>
        <button
          onClick={() => setActiveTab('offences')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
            activeTab === 'offences'
              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent font-bold'
              : 'border-dark-border hover:bg-slate-900 text-text-muted hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Citation Fines Scale
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
            activeTab === 'webhook'
              ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent font-bold'
              : 'border-dark-border hover:bg-slate-900 text-text-muted hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Webhook Status
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'cameras' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">ARH Camera Nodes</h3>
            <button
              onClick={() => fetchCameras()}
              className="text-xs text-brand-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh status
            </button>
          </div>

          {camerasLoading ? (
            <div className="text-xs text-text-muted italic py-6">Connecting to camera controller endpoints...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.map((cam) => (
                <div key={cam.camera_id} className="glass-panel rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 border border-dark-border p-2.5 rounded-lg text-slate-300">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{cam.camera_name}</h4>
                      <p className="text-xs text-text-muted mt-0.5">{cam.camera_location}</p>
                      <span className="text-[10px] font-mono text-text-muted mt-1 block">MAC: {cam.camera_id}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      cam.status === 'ONLINE' ? 'bg-status-cleared/15 text-status-cleared' : 'bg-status-fined/15 text-status-fined'
                    }`}>
                      {cam.status}
                    </span>
                    <span className="text-[10px] text-text-muted font-tabular">
                      Active: {cam.zone_assigned}
                    </span>
                  </div>
                </div>
              ))}
              {cameras.length === 0 && (
                <div className="text-xs text-text-muted italic py-4 col-span-2">
                  No camera nodes registered on the network interface.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'zones' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <h3 className="text-sm font-bold text-slate-200">Enforcement Zone Boundaries</h3>
          
          {zonesLoading ? (
            <div className="text-xs text-text-muted italic py-6">Loading zone configurations...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {zones.map((z) => (
                <div key={z.zone_id} className="glass-panel rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-300 mb-2">
                    <Map className="w-4 h-4 text-brand-accent shrink-0" />
                    <h4 className="text-sm font-bold text-slate-200">{z.zone_name}</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-text-muted">Zone ID</span>
                  <span className="text-xs text-slate-300 font-mono">{z.zone_id}</span>
                  {z.description && (
                    <p className="text-xs text-text-muted mt-2 border-t border-dark-border/40 pt-2 italic">
                      "{z.description}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-panel rounded-xl p-5 animate-slide-up flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-accent" />
            Enforcement Officer Personnel
          </h3>

          <div className="overflow-x-auto w-full text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border/60 text-text-muted font-bold uppercase tracking-wider">
                  <th className="py-2 px-3">Officer Name</th>
                  <th className="py-2 px-3">Username</th>
                  <th className="py-2 px-3">Enforcement Role</th>
                  <th className="py-2 px-3">Badge Number</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/30 text-slate-300">
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Admin Supervisor</td>
                  <td className="py-2.5 px-3">admin.main</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-brand-accent/15 text-brand-accent px-2 py-0.5 rounded font-bold">ADMIN</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">BADGE-0010</td>
                  <td className="py-2.5 px-3 text-right text-brand-accent hover:underline cursor-pointer">Edit Profile</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Patrol Officer John</td>
                  <td className="py-2.5 px-3">officer.john</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-status-cleared/15 text-status-cleared px-2 py-0.5 rounded font-bold">OFFICER</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">BADGE-2910</td>
                  <td className="py-2.5 px-3 text-right text-brand-accent hover:underline cursor-pointer">Edit Profile</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">Enforcement Supervisor</td>
                  <td className="py-2.5 px-3">supervisor.traffic</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-status-disputed/15 text-status-disputed px-2 py-0.5 rounded font-bold">SUPERVISOR</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">BADGE-8820</td>
                  <td className="py-2.5 px-3 text-right text-brand-accent hover:underline cursor-pointer">Edit Profile</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'offences' && (
        <div className="glass-panel rounded-xl p-5 animate-slide-up flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
            Citation Offence Codes & Fine Tariffs
          </h3>

          <div className="overflow-x-auto w-full text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dark-border/60 text-text-muted font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Offence Code</th>
                  <th className="py-2.5 px-3">Offence Classification</th>
                  <th className="py-2.5 px-3">Default Fine Amount (₦)</th>
                  <th className="py-2.5 px-3 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/30 text-slate-300">
                {OFFENCE_CODES.map((oc) => (
                  <tr key={oc.code} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{oc.code}</td>
                    <td className="py-2.5 px-3 text-slate-300">{oc.desc}</td>
                    <td className="py-2.5 px-3 font-tabular font-bold text-status-fined">
                      ₦{oc.defaultAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-brand-accent hover:underline cursor-pointer">Edit Tariff</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Webhook Metrics Cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-brand-accent" />
                Live Webhook Ingestion Feed
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                  <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Receiver Address</span>
                  <span className="font-semibold text-slate-200 mt-1 block select-all">http://98.94.86.116/api/logs</span>
                </div>
                <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                  <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Ingestion State</span>
                  <span className="font-bold text-status-cleared mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> ACTIVE ({webhookHeartbeat})
                  </span>
                </div>
                <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                  <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Last Ingest Event</span>
                  <span className="font-tabular text-slate-300 mt-1 block">{new Date(lastWebhookTime).toLocaleTimeString()}</span>
                  <span className="text-[9px] text-text-muted mt-0.5 block">{new Date(lastWebhookTime).toLocaleDateString()}</span>
                </div>
                <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                  <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Event Frequency</span>
                  <span className="font-semibold text-slate-200 mt-1 block">4.2 scans / minute</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
                Camera Configuration Template
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Copy this Result Upload template variables format into your ARH Carmen SmartCam Device Title and Format editor (under ANPR Settings → Result Upload → Configure Result File Format) to output correctly structured JSON.
              </p>
              <pre className="bg-slate-950 p-3.5 rounded-lg border border-dark-border/60 text-[10px] text-slate-400 font-mono overflow-x-auto select-all">
{`{
  "event_id": "$(ID)",
  "anpr_text": "$DB2JSON($(ANPR_TEXT))",
  "camera_id": "$(cameraid)",
  "camera_location": "$(location)",
  "captured_at": "$FormatTime($(FRAMETIMEMS), 'yyyy-MM-ddTHH:mm:ss.SSSXXX')",
  "vehicle_image_b64": "$(normal_img)",
  "plate_image_b64": "$(lp_img)"
}`}
              </pre>
            </div>
          </div>

          {/* Side Notifications settings */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 text-xs">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
              Notification Routing
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" defaultChecked className="mt-1" id="notify-disputes" />
                <div>
                  <label htmlFor="notify-disputes" className="font-bold text-slate-300 block cursor-pointer">Disputed Citation Alert</label>
                  <span className="text-[10px] text-text-muted leading-relaxed block">Send immediate alert when a fine is disputed by a vehicle owner.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" defaultChecked className="mt-1" id="notify-daily" />
                <div>
                  <label htmlFor="notify-daily" className="font-bold text-slate-300 block cursor-pointer">Daily Summary Dispatch</label>
                  <span className="text-[10px] text-text-muted leading-relaxed block">Send daily aggregated PDF metrics summary to configured supervisor emails at 18:00 WAT.</span>
                </div>
              </div>

              <div className="border-t border-dark-border/40 pt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-text-muted" /> Supervisor E-mail
                  </span>
                  <input
                    type="email"
                    defaultValue="supervisor.laspa@lagosstate.gov.ng"
                    className="bg-slate-900 border border-dark-border rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-text-muted" /> Supervisor SMS Dispatch
                  </span>
                  <input
                    type="text"
                    defaultValue="+234 809 123 4567"
                    className="bg-slate-900 border border-dark-border rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Settings;

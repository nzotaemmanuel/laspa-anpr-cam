import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { DetectionEvent } from '../types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: Record<string, any>) => void;
  actionType: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED' | null;
  event: DetectionEvent | null;
}

const OFFENCE_CODES = [
  { code: 'ILLEGAL_PARK', desc: 'Obstruction / Illegal Parking', defaultAmount: 30000 },
  { code: 'SPEEDING', desc: 'Exceeding Speed Limit', defaultAmount: 50000 },
  { code: 'ONE_WAY', desc: 'Driving Against Traffic (One-Way)', defaultAmount: 100000 },
  { code: 'EXPIRED_REG', desc: 'Expired Vehicle Registration / Documents', defaultAmount: 25000 },
  { code: 'NO_PLATE', desc: 'Driving Without License Plate', defaultAmount: 40000 },
  { code: 'BUS_LANE', desc: 'BRT Lane Infringement', defaultAmount: 70000 },
];

const TOW_COMPANIES = [
  'LASPA Central Towing Services',
  'Bell Roadside Towing & Recovery',
  'Metro Heavy-Duty Towing Corp',
  'Lagos State Traffic Logistics',
];

const IMPOUND_YARDS = [
  'Alausa Central Impound Yard',
  'Gbagada Enforcement Yard',
  'Oshodi Traffic Holding Base',
  'Apapa Vehicle Impound Center',
];

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  actionType,
  event,
}) => {
  const [notes, setNotes] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError(null);
      
      // Setup default form fields based on action type
      if (actionType === 'FINED') {
        const defaultOffence = OFFENCE_CODES[0];
        setFormData({
          offence_code: defaultOffence.code,
          amount: defaultOffence.defaultAmount,
        });
      } else if (actionType === 'CLAMPED') {
        setFormData({
          officer_badge: '',
        });
      } else if (actionType === 'TOWED') {
        setFormData({
          tow_company: TOW_COMPANIES[0],
          destination: IMPOUND_YARDS[0],
        });
      } else if (actionType === 'IMPOUNDED') {
        setFormData({
          impound_yard: IMPOUND_YARDS[0],
          reason: 'Severe traffic violation',
        });
      } else if (actionType === 'BOOKED') {
        setFormData({
          duration_hours: 2,
          bay_number: 'B-01',
        });
      } else {
        setFormData({});
      }
    }
  }, [isOpen, actionType]);

  if (!isOpen || !actionType || !event) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      
      // Update default amount if offence code changes
      if (actionType === 'FINED' && key === 'offence_code') {
        const selected = OFFENCE_CODES.find((oc) => oc.code === value);
        if (selected) {
          next.amount = selected.defaultAmount;
        }
      }
      
      return next;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (actionType === 'FINED') {
      if (!formData.amount || formData.amount <= 0) {
        setError('Fine amount must be greater than zero.');
        return;
      }
    } else if (actionType === 'CLAMPED') {
      if (!formData.officer_badge.trim()) {
        setError('Officer badge number is required.');
        return;
      }
    } else if (actionType === 'TOWED') {
      if (!formData.destination.trim()) {
        setError('Destination impound yard is required.');
        return;
      }
    } else if (actionType === 'IMPOUNDED') {
      if (!formData.reason.trim()) {
        setError('Impound reason is required.');
        return;
      }
    } else if (actionType === 'BOOKED') {
      if (!formData.duration_hours || formData.duration_hours <= 0) {
        setError('Booking duration must be greater than 0.');
        return;
      }
      if (!formData.bay_number.trim()) {
        setError('Bay number is required.');
        return;
      }
    }

    // Submit payload with details & notes
    onSubmit({
      ...formData,
      notes: notes.trim(),
    });
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'FINED': return 'Issue Citation Fine';
      case 'CLAMPED': return 'Confirm Vehicle Clamping';
      case 'TOWED': return 'Dispatch Tow Truck';
      case 'IMPOUNDED': return 'Approve Vehicle Impoundment';
      case 'BOOKED': return 'Create Short-Term Parking Booking';
      case 'CLEARED': return 'Clear Vehicle (No Infringement)';
      default: return 'Take Action';
    }
  };

  const getActionButtonStyle = () => {
    switch (actionType) {
      case 'FINED': return 'bg-status-fined hover:bg-red-600 focus:ring-status-fined/50';
      case 'CLAMPED': return 'bg-status-clamped hover:bg-orange-600 focus:ring-status-clamped/50';
      case 'TOWED': return 'bg-status-towed hover:bg-purple-600 focus:ring-status-towed/50';
      case 'IMPOUNDED': return 'bg-status-impounded hover:bg-red-950 focus:ring-status-impounded/50';
      case 'BOOKED': return 'bg-status-booked hover:bg-sky-600 focus:ring-status-booked/50';
      case 'CLEARED': return 'bg-status-cleared hover:bg-green-600 focus:ring-status-cleared/50';
      default: return 'bg-brand-accent hover:bg-brand-accent-hover';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 transition-opacity duration-200">
      <div 
        className="glass-modal max-w-lg w-full rounded-2xl border border-dark-border p-6 shadow-2xl animate-slide-up flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border pb-4 mb-4">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            {getActionTitle()}
          </h3>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          {/* Target Plate Info */}
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-dark-border">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Target Vehicle</div>
              <div className="font-plate text-slate-200 tracking-wider">
                {event.anpr_text.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Camera & Zone</div>
              <div className="text-xs text-slate-300 font-semibold">
                {event.camera_name || event.camera_id} — {event.camera_location}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 bg-status-fined/10 text-status-fined border border-status-fined/20 p-3 rounded-lg text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Action-Specific Form Fields */}
          {actionType === 'FINED' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Offence Code & Description</label>
                <select
                  value={formData.offence_code || ''}
                  onChange={(e) => handleFieldChange('offence_code', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                >
                  {OFFENCE_CODES.map((oc) => (
                    <option key={oc.code} value={oc.code}>
                      {oc.desc} ({oc.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Fine Amount (₦)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount || 0}
                  onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm font-semibold focus:border-brand-accent focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {actionType === 'CLAMPED' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Enforcement Officer Badge #</label>
                <input
                  type="text"
                  placeholder="e.g. OFF-8820"
                  value={formData.officer_badge || ''}
                  onChange={(e) => handleFieldChange('officer_badge', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {actionType === 'TOWED' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Tow Logistics Provider</label>
                <select
                  value={formData.tow_company || ''}
                  onChange={(e) => handleFieldChange('tow_company', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                >
                  {TOW_COMPANIES.map((tc) => (
                    <option key={tc} value={tc}>{tc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Impound Destination Yard</label>
                <select
                  value={formData.destination || ''}
                  onChange={(e) => handleFieldChange('destination', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                >
                  {IMPOUND_YARDS.map((iy) => (
                    <option key={iy} value={iy}>{iy}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {actionType === 'IMPOUNDED' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Impound Facility Location</label>
                <select
                  value={formData.impound_yard || ''}
                  onChange={(e) => handleFieldChange('impound_yard', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                >
                  {IMPOUND_YARDS.map((iy) => (
                    <option key={iy} value={iy}>{iy}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Impoundment Cause / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Absense of operator, expired taxi license"
                  value={formData.reason || ''}
                  onChange={(e) => handleFieldChange('reason', e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {actionType === 'BOOKED' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={formData.duration_hours || 0}
                    onChange={(e) => handleFieldChange('duration_hours', parseInt(e.target.value))}
                    className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Parking Bay Number</label>
                  <input
                    type="text"
                    placeholder="e.g. A-14"
                    value={formData.bay_number || ''}
                    onChange={(e) => handleFieldChange('bay_number', e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
              Remarks / Notes {actionType === 'CLEARED' ? '(Optional)' : '(Required)'}
            </label>
            <textarea
              rows={3}
              placeholder={actionType === 'CLEARED' ? 'Add any details explaining the release (optional)...' : 'Describe the infraction details or evidence remarks...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={actionType !== 'CLEARED'}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-dark-border text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer shadow-md ${getActionButtonStyle()}`}
            >
              Confirm {actionType === 'CLEARED' ? 'Clear' : 'Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export { OFFENCE_CODES };

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { maskPhone, maskId, maskEmail, maskBirthDate } from '../../utils/dataMasking';
import { API_BASE, getAuthHeaders } from '../../config/api';
import { getCurrentUser } from '../../utils/userProfile';

interface MaskedTextProps {
  value: string | null | undefined;
  type?: 'phone' | 'id' | 'email' | 'birthdate' | 'custom';
  maskFn?: (val: string) => string;
  className?: string;
  defaultRevealed?: boolean;
  /** Subject name for audit log (e.g., beneficiary/applicant name) */
  auditSubject?: string;
  /** Field name for audit log (e.g., "QCID", "Contact Number", "Email") */
  auditField?: string;
  /** Module name for audit log (e.g., "Beneficiary Management", "Case Management") */
  auditModule?: string;
  /** Optional reference number for audit log */
  referenceNo?: string;
  /** If true, show "[ 👁️ Show / Hide ]" button text along with icon */
  showButtonLabel?: boolean;
  /** Disable reveal button if purely read-only masked */
  readOnlyMask?: boolean;
}

export function MaskedText({
  value,
  type = 'phone',
  maskFn,
  className = '',
  defaultRevealed = false,
  auditSubject,
  auditField,
  auditModule,
  referenceNo,
  showButtonLabel = false,
  readOnlyMask = false,
}: MaskedTextProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);

  if (!value || value === '—') {
    return <span className={className}>—</span>;
  }

  const raw = String(value);

  const getMasked = () => {
    if (maskFn) return maskFn(raw);
    switch (type) {
      case 'phone':
        return maskPhone(raw);
      case 'id':
        return maskId(raw);
      case 'email':
        return maskEmail(raw);
      case 'birthdate':
        return maskBirthDate(raw);
      default:
        return maskPhone(raw);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !revealed;
    setRevealed(nextState);

    // If revealing sensitive data and audit parameters exist, record in Audit Log / Activity Trail
    if (nextState) {
      const user = getCurrentUser();
      const actorName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Authorized Staff';
      const actorRole = user?.role || 'Social Worker';
      const fieldName = auditField || (type === 'id' ? 'QCID' : type === 'phone' ? 'Contact Number' : type === 'email' ? 'Email Address' : 'Personal Data');
      const subj = auditSubject || 'Beneficiary';

      const logPayload = {
        actor: actorName,
        actorRole: actorRole,
        action: 'UNMASK_PII',
        module: auditModule || 'Data Privacy',
        referenceNo: referenceNo || null,
        subject: subj,
        detail: `Social Worker ${actorName} unmasked sensitive PII (${fieldName}) of ${subj} for verification.`,
      };

      // Non-blocking fetch to backend audit trail
      fetch(`${API_BASE}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(logPayload),
      }).catch((err) => {
        console.warn('Failed to record unmask activity:', err);
      });
    }
  };

  const displayText = revealed ? raw : getMasked();

  if (readOnlyMask) {
    return <span className={`font-mono ${className}`}>{displayText}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <span>{displayText}</span>
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-sans rounded transition-all select-none ${
          showButtonLabel
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            : 'p-0.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title={revealed ? 'Hide sensitive data (Data Privacy Act)' : 'Reveal sensitive data (Logged in Audit Trail)'}
        aria-label={revealed ? 'Hide sensitive data' : 'Reveal sensitive data'}
      >
        {revealed ? (
          <>
            <EyeOff className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700 dark:text-slate-400" />
            {showButtonLabel && <span>Hide</span>}
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400" />
            {showButtonLabel && <span>Show</span>}
          </>
        )}
      </button>
    </span>
  );
}

export default MaskedText;

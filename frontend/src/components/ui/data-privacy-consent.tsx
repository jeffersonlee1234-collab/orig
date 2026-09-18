import { useState } from "react"
import { ShieldCheck, FileText, Lock, Eye, AlertCircle, CheckCircle2, X } from "lucide-react"

interface DataPrivacyConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string | boolean
  required?: boolean
  className?: string
  moduleName?: string
}

export function DataPrivacyConsent({
  checked,
  onChange,
  error,
  required = true,
  className = "",
  moduleName = "Social Service Assistance",
}: DataPrivacyConsentProps) {
  const [showModal, setShowModal] = useState(false)

  const hasError = Boolean(error)
  const errorMessage = typeof error === "string" ? error : "Mandatory: You must agree to the Data Privacy Policy to submit your application."

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      hasError 
        ? "border-red-500/60 bg-red-50/50 dark:bg-red-950/20 shadow-sm" 
        : checked 
          ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10" 
          : "border-border bg-card/60 hover:border-primary/40"
    } ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5 mt-0.5">
          <input
            id="data-privacy-consent-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            required={required}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 dark:accent-blue-500"
          />
        </div>

        <div className="flex-1 text-xs sm:text-sm">
          <label htmlFor="data-privacy-consent-checkbox" className="font-medium text-foreground cursor-pointer leading-relaxed select-none">
            I hereby agree and consent to the collection, processing, and storage of my personal data for my <span className="font-semibold text-primary">{moduleName}</span> application, in compliance with the <span className="font-semibold text-foreground">Quezon City SSDD Data Privacy Policy</span> and <span className="font-semibold text-foreground">Republic Act No. 10173 (Data Privacy Act of 2012)</span>. {required && <span className="text-red-500 font-bold">*</span>}
          </label>

          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer focus:outline-none"
            >
              <FileText className="h-3.5 w-3.5" />
              Read Full Data Privacy Policy
            </button>
            <span className="text-muted-foreground/60 hidden sm:inline">•</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3 text-emerald-500" /> 256-bit Encrypted & Secured
            </span>
          </div>

          {hasError && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Data Privacy Modal */}
      {showModal && (
        <DataPrivacyModal onClose={() => setShowModal(false)} onAgree={() => { onChange(true); setShowModal(false); }} />
      )}
    </div>
  )
}

export function DataPrivacyModal({ onClose, onAgree }: { onClose: () => void; onAgree?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Data Privacy Consent & Agreement Notice</h2>
              <p className="text-xs text-muted-foreground">Quezon City SSDD • Republic Act No. 10173 (Data Privacy Act of 2012)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-foreground/90 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-normal">
              Your privacy and the security of your personal data are of utmost importance to the Quezon City Social Services Development Department (SSDD). Please read this Policy Notice before proceeding.
            </p>
          </div>

          <section className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 1. Data Collection & Purpose
            </h3>
            <p className="text-muted-foreground">
              By submitting an application or registration, you authorize Quezon City SSDD to collect, store, and process your personal and sensitive information, including but not limited to:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Full Name, Birthdate, Gender, Civil Status, and Contact Information</li>
              <li>Barangay Address, QC ID Number, and Household Information</li>
              <li>Supporting Document Filings (Government IDs, Medical Certificates, Income Proof, Funeral Bills)</li>
              <li>Emergency Contact Person details</li>
            </ul>
            <p className="text-muted-foreground">
              This information is processed exclusively for verifying your eligibility, scheduling assistance, disbursing financial aid, issuing ID booklets, and managing municipal social welfare records.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> 2. Confidentiality & Data Security
            </h3>
            <p className="text-muted-foreground">
              All collected data is stored securely in encrypted databases. Access is strictly controlled under role-based authorization for accredited Social Workers, SSDD Officers, and System Administrators. Your information will <strong>never be sold, rented, or shared with unauthorized commercial third parties</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" /> 3. Data Subject Rights (RA 10173)
            </h3>
            <p className="text-muted-foreground">
              Under the Philippine Data Privacy Act of 2012, you hold the right to:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Right to be Informed:</strong> Know how your data is collected and processed.</li>
              <li><strong>Right to Access:</strong> View your active social welfare applications and record details.</li>
              <li><strong>Right to Rectification:</strong> Request corrections to inaccurate or outdated personal details.</li>
              <li><strong>Right to Erasure / Archiving:</strong> Request archiving or deletion of your record when allowable by government accounting and audit rules.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" /> 4. Declaration of Truthfulness
            </h3>
            <p className="text-muted-foreground">
              By checking the agreement checkbox, you certify that all information supplied in your application is true, correct, and updated to the best of your knowledge.
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            Close Notice
          </button>
          {onAgree && (
            <button
              type="button"
              onClick={onAgree}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              I Agree & Accept Data Policy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

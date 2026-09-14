import { useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  MessageCircle,
  UserCheck,
  ThumbsUp,
  Wallet,
} from "lucide-react"

const requirementsByType: Record<string, string[]> = {
  "Medical assistance": [
    "Valid government-issued ID",
    "Barangay Certificate of Indigency",
    "Medical abstract or hospital bill",
    "Doctor's prescription (if applicable)",
  ],
  "Burial assistance": [
    "Valid government-issued ID",
    "Barangay Certificate of Indigency",
    "Death certificate",
    "Funeral contract or statement of account",
  ],
  "Educational assistance": [
    "Valid government-issued ID",
    "Barangay Certificate of Indigency",
    "Certificate of enrollment or school ID",
    "Report card (if applicable)",
  ],
  "Transportation assistance": [
    "Valid government-issued ID",
    "Barangay Certificate of Indigency",
    "Referral letter (if applicable)",
  ],
}

// Admin/staff process flow only. Application intake now happens on the
// resident-facing portal (user-portal/apply-aics.tsx) — staff always start
// here from an already-submitted case, at Verification.
const steps = [
  { label: "Verification", icon: FileCheck2 },
  { label: "Interview", icon: MessageCircle },
  { label: "Assessment", icon: UserCheck },
  { label: "Approval", icon: ThumbsUp },
  { label: "Release Assistance", icon: Wallet },
]

export type AICSApplicationResult = {
  name: string
  type: string
  amount: string
  status: string
}

// Info submitted by the resident online. Required — the admin wizard only
// ever processes an existing submission, it never creates one from scratch.
export type AICSApplicantInfo = {
  name: string
  address: string
  contact: string
  type: string
  narrative: string
}

export function AICSApplicationWizard({
  onCancel,
  onSubmit,
  applicant,
}: {
  onCancel: () => void
  onSubmit: (result: AICSApplicationResult) => void
  applicant: AICSApplicantInfo
}) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { name, type, address, contact, narrative } = applicant

  // Step 1 — Verification (Supporting Documents input)
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})

  // Step 2 — Interview
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewNotes, setInterviewNotes] = useState("")

  // Step 3 — Assessment
  const [assessmentNotes, setAssessmentNotes] = useState("")
  const [recommendedAmount, setRecommendedAmount] = useState("")
  const [eligible, setEligible] = useState<"eligible" | "not-eligible">("eligible")

  // Step 4 — Approval (output: Assistance Approval)
  const [officer, setOfficer] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<"Approved" | "Disapproved">("Approved")

  // Step 5 — Release Assistance (output: Financial Aid Record)
  const [releaseAmount, setReleaseAmount] = useState("")
  const [releaseDate, setReleaseDate] = useState("")
  const [remarks, setRemarks] = useState("")

  const requirements = requirementsByType[type] ?? []
  const allChecked = requirements.length > 0 && requirements.every((r) => checkedDocs[r])
  const isApproved = approvalStatus === "Approved"

  const canProceed = () => {
    if (step === 0) return allChecked
    if (step === 1) return interviewDate && interviewNotes.trim()
    if (step === 2) return assessmentNotes.trim() && recommendedAmount
    if (step === 3) return officer.trim()
    if (step === 4) return !isApproved || (releaseAmount && releaseDate)
    return true
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    setSubmitted(true)
    onSubmit({
      name,
      type,
      amount: `₱${Number((isApproved ? releaseAmount : 0) || 0).toLocaleString()}`,
      status: isApproved ? "Released" : "Disapproved",
    })
  }

  const handleBack = () => {
    if (step === 0) {
      onCancel()
      return
    }
    setStep(step - 1)
  }

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 shadow-soft flex flex-col items-center text-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center">
          <Check className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-lg font-heading font-semibold text-foreground">Application processed</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {name}'s {type.toLowerCase()} request has been logged with status "
          {isApproved ? "Released" : "Disapproved"}".
        </p>
        <button
          onClick={onCancel}
          className="mt-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stepper header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-soft overflow-x-auto">
        <div className="flex items-center min-w-150">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                      isDone
                        ? "bg-success text-white"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      i < step ? "bg-success" : "bg-border"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Applicant summary — read-only, submitted online by the resident */}
      <div className="bg-muted/50 border border-border rounded-2xl p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground mb-1">Applicant (submitted online)</p>
        <p className="text-foreground font-medium">{name} — {type}</p>
        <p className="text-muted-foreground text-xs mt-1">{address} · {contact}</p>
        <p className="text-muted-foreground text-xs mt-2">{narrative}</p>
      </div>

      {/* Step content */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Verification — {type}</h2>
            <p className="text-xs text-muted-foreground">Check each supporting document as it is received and verified from the applicant.</p>
            <div className="space-y-2">
              {requirements.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedDocs[r]}
                    onChange={(e) => setCheckedDocs((c) => ({ ...c, [r]: e.target.checked }))}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground">{r}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Interview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Interview date">
                <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className={`${inputCls} h-10`} />
              </Field>
              <Field label="Interview notes" full>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Summary of what the applicant shared during the interview..."
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Social worker assessment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Recommended amount (₱)">
                <input
                  type="number"
                  value={recommendedAmount}
                  onChange={(e) => setRecommendedAmount(e.target.value)}
                  className={`${inputCls} h-10`}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Eligibility">
                <div className="flex gap-3">
                  <RadioPill<"eligible" | "not-eligible"> label="Eligible" value="eligible" current={eligible} onChange={setEligible} />
                  <RadioPill<"eligible" | "not-eligible"> label="Not eligible" value="not-eligible" current={eligible} onChange={setEligible} />
                </div>
              </Field>
              <Field label="Assessment notes" full>
                <textarea
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Findings from home/case validation and overall recommendation..."
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Approval</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Approving officer">
                <input value={officer} onChange={(e) => setOfficer(e.target.value)} className={`${inputCls} h-10`} placeholder="Name of social welfare officer" />
              </Field>
              <Field label="Decision">
                <div className="flex gap-3">
                  <RadioPill<"Approved" | "Disapproved"> label="Approved" value="Approved" current={approvalStatus} onChange={setApprovalStatus} />
                  <RadioPill<"Approved" | "Disapproved"> label="Disapproved" value="Disapproved" current={approvalStatus} onChange={setApprovalStatus} />
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Release assistance</h2>
            {!isApproved ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                This application was disapproved at the Approval step — no assistance will be released. You may add a remark below before submitting.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Release amount (₱)">
                  <input
                    type="number"
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(e.target.value)}
                    className={`${inputCls} h-10`}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Release date">
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className={`${inputCls} h-10`}
                  />
                </Field>
              </div>
            )}
            <Field label="Remarks" full>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={inputCls} placeholder="Optional remarks..." />
            </Field>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Cancel" : "Back"}
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5"
        >
          {step === steps.length - 1 ? "Submit" : "Next"}
          {step < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/40"

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function RadioPill<T extends string>({
  label,
  value,
  current,
  onChange,
}: {
  label: string
  value: T
  current: T
  onChange: (v: T) => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
        active ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  )
}
import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Stethoscope,
  ThumbsUp,
  IdCard,
  HeartHandshake,
} from "lucide-react"
import { Field, RadioPill, CheckboxRow, inputCls } from "../ui/form-ui"
import { WizardStepper, type WizardStep } from "./wizard-stepper"

const requirementsByCategory: Record<string, string[]> = {
  PWD: [
    "Valid government-issued ID",
    "1x1 recent photo",
    "Medical Certificate from licensed physician",
    "Barangay Certificate of Residency",
  ],
  "Senior Citizen": [
    "Valid government-issued ID (proof of age)",
    "1x1 recent photo",
    "Barangay Certificate of Residency",
  ],
}

// Admin/staff process flow only. Intake happens on the resident-facing
// portal (user-portal/apply-pwd-senior.tsx) — staff always start here
// from an already-submitted application, at Registration.
const steps: WizardStep[] = [
  { label: "Registration", icon: ClipboardList },
  { label: "Medical Verification", icon: Stethoscope },
  { label: "Approval", icon: ThumbsUp },
  { label: "Issue ID", icon: IdCard },
  { label: "Benefits Activation", icon: HeartHandshake },
]

export type PWDSeniorApplicationResult = {
  name: string
  category: string
  idNumber: string
  status: string
}

// Info submitted by the resident online (apply-pwd-senior.tsx). Required —
// the admin wizard only ever processes an existing submission.
export type PWDSeniorApplicantInfo = {
  name: string
  address: string
  contact: string
  category: "PWD" | "Senior Citizen"
  medicalCertificate: string
}

function generateIdNumber(_category?: string, qcid?: string) {
  if (qcid && qcid.trim()) return qcid.trim()
  return "110000116932100"
}

export function PWDSeniorApplicationWizard({
  onCancel,
  onSubmit,
  applicant,
}: {
  onCancel: () => void
  onSubmit: (result: PWDSeniorApplicationResult) => void
  applicant: PWDSeniorApplicantInfo
}) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { name, address, contact, category, medicalCertificate } = applicant

  // Step 1 — Registration (Supporting Documents input)
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})

  // Step 2 — Medical Verification
  const [conditionNotes, setConditionNotes] = useState("")
  const [verifyingOfficer, setVerifyingOfficer] = useState("")
  const [eligibility, setEligibility] = useState<"Eligible" | "Not eligible">("Eligible")

  // Step 3 — Approval
  const [approvingOfficer, setApprovingOfficer] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<"Approved" | "Disapproved">("Approved")

  // Step 4 — Issue ID
  const [idNumber, setIdNumber] = useState(() => generateIdNumber(category))
  const [issueDate, setIssueDate] = useState("")

  // Step 5 — Benefits Activation
  const [socialPension, setSocialPension] = useState(false)
  const [discountBooklet, setDiscountBooklet] = useState(true)
  const [activationDate, setActivationDate] = useState("")
  const [remarks, setRemarks] = useState("")

  const requirements = requirementsByCategory[category] ?? []
  const allChecked = requirements.length > 0 && requirements.every((r) => checkedDocs[r])
  const isApproved = approvalStatus === "Approved"

  const canProceed = () => {
    if (step === 0) return allChecked
    if (step === 1) return conditionNotes.trim() && verifyingOfficer.trim()
    if (step === 2) return approvingOfficer.trim()
    if (step === 3) return !isApproved || (idNumber.trim() && issueDate)
    if (step === 4) return !isApproved || activationDate
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
      category,
      idNumber: isApproved ? idNumber : "—",
      status: isApproved ? "Issued" : "Disapproved",
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
          {name}'s {category} application has been logged with status "
          {isApproved ? "Issued" : "Disapproved"}".
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
      <WizardStepper steps={steps} step={step} />

      {/* Applicant summary — read-only, submitted online by the resident */}
      <div className="bg-muted/50 border border-border rounded-2xl p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground mb-1">Applicant (submitted online)</p>
        <p className="text-foreground font-medium">{name} — {category}</p>
        <p className="text-muted-foreground text-xs mt-1">{address} · {contact}</p>
        <p className="text-muted-foreground text-xs mt-2">Medical Certificate: {medicalCertificate || "—"}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Registration — {category}</h2>
            <p className="text-xs text-muted-foreground">
              Check each supporting document as it is received and verified from the applicant.
            </p>
            <div className="space-y-2">
              {requirements.map((r) => (
                <CheckboxRow
                  key={r}
                  label={r}
                  checked={!!checkedDocs[r]}
                  onChange={(checked) => setCheckedDocs((c) => ({ ...c, [r]: checked }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Medical verification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Verifying physician / health officer">
                <input
                  value={verifyingOfficer}
                  onChange={(e) => setVerifyingOfficer(e.target.value)}
                  className={`${inputCls} h-10`}
                  placeholder="Name of verifying physician or officer"
                />
              </Field>
              <Field label="Eligibility">
                <div className="flex gap-3">
                  <RadioPill label="Eligible" value="Eligible" current={eligibility} onChange={setEligibility} />
                  <RadioPill label="Not eligible" value="Not eligible" current={eligibility} onChange={setEligibility} />
                </div>
              </Field>
              <Field label="Condition / verification notes" full>
                <textarea
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Findings from medical certificate review or health assessment..."
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Approval</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Approving officer">
                <input
                  value={approvingOfficer}
                  onChange={(e) => setApprovingOfficer(e.target.value)}
                  className={`${inputCls} h-10`}
                  placeholder="Name of social welfare officer"
                />
              </Field>
              <Field label="Decision">
                <div className="flex gap-3">
                  <RadioPill label="Approved" value="Approved" current={approvalStatus} onChange={setApprovalStatus} />
                  <RadioPill label="Disapproved" value="Disapproved" current={approvalStatus} onChange={setApprovalStatus} />
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Issue ID</h2>
            {!isApproved ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                This application was disapproved at the Approval step — no ID will be issued. You may still submit to close the record.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={category === "PWD" ? "PWD ID number" : "Senior citizen ID number"}>
                  <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
                <Field label="Issue date">
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Benefits activation</h2>
            {!isApproved ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                No benefits will be activated for a disapproved application.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <CheckboxRow label="Purchase discount booklet (20% discount / VAT exemption)" checked={discountBooklet} onChange={setDiscountBooklet} />
                  <CheckboxRow label="Social pension enrollment" checked={socialPension} onChange={setSocialPension} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Activation date">
                    <input type="date" value={activationDate} onChange={(e) => setActivationDate(e.target.value)} className={`${inputCls} h-10`} />
                  </Field>
                </div>
              </>
            )}
            <Field label="Remarks" full>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={inputCls} placeholder="Optional remarks..." />
            </Field>
          </div>
        )}
      </div>

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

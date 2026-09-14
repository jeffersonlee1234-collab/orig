import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  FileCheck2,
  MessageCircle,
  ThumbsUp,
  IdCard,
} from "lucide-react"
import { Field, RadioPill, CheckboxRow, inputCls } from "../ui/form-ui"
import { WizardStepper, type WizardStep } from "./wizard-stepper"

const documentRequirements = [
  "Valid government-issued ID",
  "Proof of Status (Barangay Certificate / death certificate / court order, as applicable)",
  "Birth certificate(s) of child/children",
  "Certificate of Indigency (if applicable)",
]

// Admin/staff process flow only. Intake happens on the resident-facing
// portal (user-portal/apply-solo-parent.tsx) — staff always start here
// from an already-submitted application, at Application review.
const steps: WizardStep[] = [
  { label: "Application", icon: ClipboardList },
  { label: "Document Review", icon: FileCheck2 },
  { label: "Interview", icon: MessageCircle },
  { label: "Approval", icon: ThumbsUp },
  { label: "Issue ID", icon: IdCard },
]

export type SoloParentApplicationResult = {
  name: string
  status: string
  idNumber: string
}

// Info submitted by the resident online (apply-solo-parent.tsx). Required —
// the admin wizard only ever processes an existing submission.
export type SoloParentApplicantInfo = {
  name: string
  address: string
  contact: string
  dependents: string
  proofOfStatus: string
}

function generateIdNumber(qcid?: string) {
  if (qcid && qcid.trim()) return qcid.trim()
  return "110000116932100"
}

export function SoloParentApplicationWizard({
  onCancel,
  onSubmit,
  applicant,
}: {
  onCancel: () => void
  onSubmit: (result: SoloParentApplicationResult) => void
  applicant: SoloParentApplicantInfo
}) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { name, address, contact, dependents, proofOfStatus } = applicant

  // Step 1 — Application review
  const [detailsConfirmed, setDetailsConfirmed] = useState(false)
  const [applicationNotes, setApplicationNotes] = useState("")

  // Step 2 — Document Review
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})

  // Step 3 — Interview
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewNotes, setInterviewNotes] = useState("")

  // Step 4 — Approval
  const [approvingOfficer, setApprovingOfficer] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<"Approved" | "Disapproved">("Approved")

  // Step 5 — Issue ID
  const [idNumber, setIdNumber] = useState(generateIdNumber)
  const [issueDate, setIssueDate] = useState("")
  const [remarks, setRemarks] = useState("")

  const allChecked = documentRequirements.every((r) => checkedDocs[r])
  const isApproved = approvalStatus === "Approved"

  const canProceed = () => {
    if (step === 0) return detailsConfirmed
    if (step === 1) return allChecked
    if (step === 2) return interviewDate && interviewNotes.trim()
    if (step === 3) return approvingOfficer.trim()
    if (step === 4) return !isApproved || (idNumber.trim() && issueDate)
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
      status: isApproved ? "Approved" : "Disapproved",
      idNumber: isApproved ? idNumber : "—",
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
          {name}'s solo parent application has been logged with status "{isApproved ? "Approved" : "Disapproved"}".
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
        <p className="text-foreground font-medium">{name} — {dependents}</p>
        <p className="text-muted-foreground text-xs mt-1">{address} · {contact}</p>
        <p className="text-muted-foreground text-xs mt-2">Proof of Status: {proofOfStatus || "—"}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Application review</h2>
            <p className="text-xs text-muted-foreground">
              Confirm the applicant's submitted details are complete before moving to document review.
            </p>
            <CheckboxRow
              label="I have reviewed the applicant's submitted details and dependents information"
              checked={detailsConfirmed}
              onChange={setDetailsConfirmed}
            />
            <Field label="Application notes" full>
              <textarea
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Optional notes on the initial application review..."
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Document review</h2>
            <p className="text-xs text-muted-foreground">Check each supporting document as it is received and verified.</p>
            <div className="space-y-2">
              {documentRequirements.map((r) => (
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

        {step === 2 && (
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

        {step === 3 && (
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

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Issue ID</h2>
            {!isApproved ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                This application was disapproved at the Approval step — no Solo Parent will be issued.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Solo Parent ID number">
                  <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
                <Field label="Issue date">
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
              </div>
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

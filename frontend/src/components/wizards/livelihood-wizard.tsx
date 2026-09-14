import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  UserCheck,
  GraduationCap,
  CheckCircle2,
  Award,
} from "lucide-react"
import { Field, RadioPill, CheckboxRow, inputCls } from "../ui/form-ui"
import { WizardStepper, type WizardStep } from "./wizard-stepper"

const documentRequirements = [
  "Valid government-issued ID",
  "Barangay Certificate of Residency",
  "Proof of unemployment or low income (if applicable)",
]

const trainingPrograms = [
  "Dressmaking NC II",
  "Food processing basics",
  "Electrical installation NC II",
  "Livelihood kit — sari-sari store",
]

const partners = ["TESDA", "City LGU"]

const steps: WizardStep[] = [
  { label: "Registration", icon: ClipboardList },
  { label: "Skills Assessment", icon: UserCheck },
  { label: "Training Assignment", icon: GraduationCap },
  { label: "Completion", icon: CheckCircle2 },
  { label: "Certification", icon: Award },
]

export type LivelihoodApplicationResult = {
  name: string
  program: string
  status: string
}

export type LivelihoodApplicantInfo = {
  name: string
  address: string
  contact: string
  preferredProgram: string
  narrative: string
}

function generateCertNumber(qcid?: string) {
  if (qcid && qcid.trim()) return qcid.trim()
  return "110000116932100"
}

export function LivelihoodApplicationWizard({
  onCancel,
  onSubmit,
  applicant,
}: {
  onCancel: () => void
  onSubmit: (result: LivelihoodApplicationResult) => void
  applicant: LivelihoodApplicantInfo
}) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { name, address, contact, preferredProgram, narrative } = applicant

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})

  const [skillLevel, setSkillLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner")
  const [recommendedProgram, setRecommendedProgram] = useState(preferredProgram || trainingPrograms[0])
  const [assessmentNotes, setAssessmentNotes] = useState("")
  const [eligibility, setEligibility] = useState<"Eligible" | "Not eligible">("Eligible")

  const [partner, setPartner] = useState(partners[0])
  const [startDate, setStartDate] = useState("")

  const [completionStatus, setCompletionStatus] = useState<"Completed" | "Incomplete">("Completed")
  const [completionDate, setCompletionDate] = useState("")
  const [completionRemarks, setCompletionRemarks] = useState("")

  const [certType, setCertType] = useState("NC II Certificate")
  const [certNumber, setCertNumber] = useState(generateCertNumber)
  const [certDate, setCertDate] = useState("")

  const allChecked = documentRequirements.every((r) => checkedDocs[r])
  const isEligible = eligibility === "Eligible"
  const isCompleted = completionStatus === "Completed"

  const canProceed = () => {
    if (step === 0) return allChecked
    if (step === 1) return assessmentNotes.trim() && recommendedProgram
    if (step === 2) return !isEligible || (partner && startDate)
    if (step === 3) return !isEligible || (completionDate)
    if (step === 4) return !isEligible || !isCompleted || (certNumber.trim() && certDate)
    return true
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    setSubmitted(true)
    let status = "Not eligible"
    if (isEligible) status = isCompleted ? "Certified" : "Incomplete"
    onSubmit({
      name,
      program: recommendedProgram,
      status,
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
          {name}'s livelihood application for {recommendedProgram} has been logged.
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

      <div className="bg-muted/50 border border-border rounded-2xl p-4 text-sm">
        <p className="text-xs font-medium text-muted-foreground mb-1">Applicant (submitted online)</p>
        <p className="text-foreground font-medium">{name} — {preferredProgram || "No preference stated"}</p>
        <p className="text-muted-foreground text-xs mt-1">{address} · {contact}</p>
        <p className="text-muted-foreground text-xs mt-2">{narrative}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Registration</h2>
            <p className="text-xs text-muted-foreground">Check each supporting document as it is received and verified.</p>
            <div className="space-y-2">
              {documentRequirements.map((r) => (
                <CheckboxRow
                  key={r}
                  label={r}
                  checked={!!checkedDocs[r]}
                  onChange={(checked: boolean) => setCheckedDocs((c) => ({ ...c, [r]: checked }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Skills assessment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Skill level">
                <div className="flex gap-2 flex-wrap">
                  <RadioPill label="Beginner" value="Beginner" current={skillLevel} onChange={setSkillLevel} />
                  <RadioPill label="Intermediate" value="Intermediate" current={skillLevel} onChange={setSkillLevel} />
                  <RadioPill label="Advanced" value="Advanced" current={skillLevel} onChange={setSkillLevel} />
                </div>
              </Field>
              <Field label="Eligibility">
                <div className="flex gap-3">
                  <RadioPill label="Eligible" value="Eligible" current={eligibility} onChange={setEligibility} />
                  <RadioPill label="Not eligible" value="Not eligible" current={eligibility} onChange={setEligibility} />
                </div>
              </Field>
              <Field label="Recommended program" full>
                <select value={recommendedProgram} onChange={(e) => setRecommendedProgram(e.target.value)} className={`${inputCls} h-10`}>
                  {trainingPrograms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assessment notes" full>
                <textarea
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Findings from the skills assessment and program fit..."
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Training assignment</h2>
            {!isEligible ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                This applicant was marked not eligible at the Skills Assessment step — no training batch will be assigned.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Program">
                  <input value={recommendedProgram} readOnly className={`${inputCls} h-10 opacity-70`} />
                </Field>
                <Field label="Partner">
                  <select value={partner} onChange={(e) => setPartner(e.target.value)} className={`${inputCls} h-10`}>
                    {partners.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Batch start date">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Completion</h2>
            {!isEligible ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                No training to complete — this applicant was not assigned to a batch.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Completion status">
                  <div className="flex gap-3">
                    <RadioPill label="Completed" value="Completed" current={completionStatus} onChange={setCompletionStatus} />
                    <RadioPill label="Incomplete" value="Incomplete" current={completionStatus} onChange={setCompletionStatus} />
                  </div>
                </Field>
                <Field label="Completion date">
                  <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
                <Field label="Remarks" full>
                  <textarea
                    value={completionRemarks}
                    onChange={(e) => setCompletionRemarks(e.target.value)}
                    rows={2}
                    className={inputCls}
                    placeholder="Attendance notes, output quality, etc..."
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Certification</h2>
            {!isEligible || !isCompleted ? (
              <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-3">
                No certificate will be issued — the applicant is either not eligible or did not complete the training.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Certification type">
                  <select value={certType} onChange={(e) => setCertType(e.target.value)} className={`${inputCls} h-10`}>
                    <option>NC II Certificate</option>
                    <option>Certificate of Completion</option>
                    <option>Livelihood Kit Release</option>
                  </select>
                </Field>
                <Field label="Certificate number">
                  <input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
                <Field label="Issue date">
                  <input type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} className={`${inputCls} h-10`} />
                </Field>
              </div>
            )}
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
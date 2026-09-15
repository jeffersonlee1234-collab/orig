import React, { useState, useEffect, useRef } from "react"
import {
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Paperclip,
  Users,
  HeartHandshake,
  Baby,
  ClipboardList,
  IdCard,
  ShieldAlert,
  Download,
} from "lucide-react"
import { toPng } from "html-to-image"
import { API_BASE } from "../../config/api"
import { cachedApiFetch } from "../../utils/cachedApiFetch"
import { notifyApplicationChange, subscribeToRealtimeChanges } from "../../utils/realtimeSync"
import { useLanguage } from "../ui/language-context"
import {
  getSavedDisbursements,
  saveDisbursements,
  pushUserNotification,
  type SyncedDisbursementRecord,
} from "../../utils/financialAidSync"
import { getApplicantPhotoUrl, ApplicantPhotoDisplay } from "./pwd-senior-citizen"
import MaskedText from "../ui/masked-text"

interface ApplicationDocument {
  name: string
  filename: string
  fileUrl: string
  dataUrl?: string
  previewUrl?: string
  fileSize: number
  uploadedAt: string
  status: "verified" | "pending" | "rejected"
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  age: string
  birthday: string
  status: string
  educationalAttainment: string
  occupationMonthlyIncome: string
}

interface SoloParentSubmission {
  id: string
  submittedAt: string
  referenceNumber: string
  category: "Solo Parent"
  applicationType: "new" | "renewal" | "loss"
  classification: string

  firstName: string
  middleName: string
  lastName: string
  suffix: string
  age: string
  sex: string
  dobMonth: string
  dobDay: string
  dobYear: string
  civilStatus?: string
  qcidNumber?: string
  email?: string
  placeOfBirth: string
  educationalAttainment: string
  occupation: string
  companyAgency: string
  monthlyIncome: string
  totalFamilyIncome: string
  contactNo: string

  addressHouseNo: string
  addressStreet: string
  addressBarangay: string
  addressCityMunicipality: string

  familyMembers: FamilyMember[]

  emergencyName: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyRelationship?: string
  emergencyAddress: string
  emergencyContactNo: string
  bloodType?: string
  formData?: any
  extraData?: any

  circumstanceDetails: string
  needsProblems: string
  familyResources: string

  documents: ApplicationDocument[]

  status: "pending" | "approved" | "rejected" | "needs_revision"
  soloParentIdNumber?: string
  assignedIdNumber?: string
  applicantPhoto?: string
  photoUrl?: string
  rejectionReason?: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

interface ChildWelfareSubmission {
  id: string
  submittedAt: string
  referenceNumber: string
  category: "Child Welfare"
  supportCategory: string

  guardianFirstName: string
  guardianMiddleName: string
  guardianLastName: string
  guardianSex: string
  guardianDateOfBirth: string
  guardianAge: string
  guardianCivilStatus: string
  guardianRelationshipToChild: string
  guardianContactNo: string
  guardianEmail: string
  guardianValidId: string

  addressHouseNo: string
  addressStreet: string
  addressBarangay: string
  addressCityMunicipality: string

  childName: string
  childSex: string
  childBirthday: string
  childAge: string
  childSchoolDaycare: string
  childBirthCertificate: string
  childGradeLevel: string
  childSchoolAddress: string
  childEnrollmentStatus: string
  childSpecialNeeds: string
  childSpecialNeedsSpecify: string

  householdMembers: string
  childrenStudying: string
  monthlyHouseholdIncome: string
  mainSourceIncome: string
  employmentStatus: string
  otherFinancialSupport: string

  supportTypes: string[]
  supportOther: string

  primaryReasonForAssistance: string
  specificNeeds: string
  estimatedAmountNeeded: string
  urgency: string

  childLivingArrangement: string
  otherChildrenNeedingAssistance: string
  otherChildrenCount: string
  otherGovtAssistanceReceived: string
  otherGovtProgram: string
  additionalInfo: string
  isReportingPersonCurrentParent?: string
  specifiedRelationship?: string
  isImmediateDanger?: string
  isChildSafe?: string
  emergencyType?: string
  emergencyDate?: string
  emergencyTime?: string
  emergencyDateTime?: string

  documents: ApplicationDocument[]

  status: "pending" | "approved" | "rejected" | "needs_revision"
  applicantPhoto?: string
  photoUrl?: string
  formData?: any
  extraData?: any
  approvedAmount?: string
  rejectionReason?: string
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

type WelfareSubmission = SoloParentSubmission | ChildWelfareSubmission

function isSoloParent(app: WelfareSubmission): app is SoloParentSubmission {
  return app.category === "Solo Parent"
}

// =====================================================================================
// Backend wiring — fetch mula sa PostgreSQL via Express API
// =====================================================================================

function getAdminAuthToken() {
  if (typeof window === "undefined") return ""
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("sessionToken") ||
    localStorage.getItem("sessionToken") ||
    ""
  )
}

function authHeaders(custom: Record<string, string> = {}) {
  const token = getAdminAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}`, "x-access-token": token, "x-session-token": token } : {}),
    ...custom,
  }
}

function parseJsonSafe(val: any, fallback: any = {}) {
  if (!val) return fallback
  if (typeof val === "object") return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}


function resolveFileUrl(fileUrl?: string, filename?: string, isChildWelfare: boolean = false): string {
  if (fileUrl) {
    if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) {
      return fileUrl
    }
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      if (fileUrl.includes("/uploads/")) {
        const pathPart = fileUrl.substring(fileUrl.indexOf("/uploads/"))
        return `${API_BASE}${pathPart}`
      }
      return fileUrl
    }
    const clean = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`
    if (clean.startsWith("/samples/")) return clean
    if (clean.startsWith("/uploads/")) return `${API_BASE}${clean}`
    const folder = isChildWelfare ? "child-welfare" : "solo-parent"
    return `${API_BASE}/uploads/${folder}${clean}`
  }
  if (filename) {
    const folder = isChildWelfare ? "child-welfare" : "solo-parent"
    return `${API_BASE}/uploads/${folder}/${filename}`
  }
  return ""
}

function mapUploadedDocuments(raw: any, isChildWelfare: boolean = false): ApplicationDocument[] {
  let uploaded = raw?.uploaded_documents || raw?.documents || raw?.uploadedDocuments
  if (!uploaded && raw?.form_data) {
    const parsedFd = typeof raw.form_data === "string" ? parseJsonSafe(raw.form_data, {}) : (raw.form_data || {})
    uploaded = parsedFd.uploaded_documents || parsedFd.documents || parsedFd.uploadedDocuments || parsedFd.uploadedFiles || parsedFd.uploadedDocs
  }
  if (!uploaded && raw?.extra_data) {
    const parsedEd = typeof raw.extra_data === "string" ? parseJsonSafe(raw.extra_data, {}) : (raw.extra_data || {})
    uploaded = parsedEd.uploaded_documents || parsedEd.documents || parsedEd.uploadedDocuments || parsedEd.uploadedFiles
  }
  uploaded = parseJsonSafe(uploaded, [])

  const rawPhoto =
    raw?.applicantPhoto ||
    raw?.applicant_photo ||
    raw?.photoUrl ||
    raw?.photo_url ||
    raw?.idPhoto ||
    raw?.id_photo ||
    raw?.form_data?.applicantPhoto ||
    raw?.form_data?.photoUrl ||
    raw?.extra_data?.applicantPhoto ||
    raw?.extra_data?.photoUrl ||
    ""

  const applicantPhoto = (rawPhoto && typeof rawPhoto === "string" && !rawPhoto.includes("/samples/")) ? rawPhoto : ""

  const docs: ApplicationDocument[] = []
  if (Array.isArray(uploaded) && uploaded.length > 0) {
    for (const group of uploaded) {
      if (!group) continue
      if (Array.isArray(group.files) && group.files.length > 0) {
        for (const f of group.files) {
          const docLabel = group.documentLabel || group.documentId || f.filename || "Uploaded Document"
          const isPhotoDoc = /2x2|photo|picture|1x1|id_pic|avatar/i.test(`${docLabel} ${f.filename || ""}`)
          const directData =
            (f.dataUrl && !f.dataUrl.includes("/samples/"))
              ? f.dataUrl
              : (f.previewUrl && !f.previewUrl.includes("/samples/"))
              ? f.previewUrl
              : (f.base64 && !f.base64.includes("/samples/"))
              ? f.base64
              : (isPhotoDoc && applicantPhoto ? applicantPhoto : "")
          const resolvedUrl = directData || resolveFileUrl(f.fileUrl || f.url || f.path, f.filename, isChildWelfare)
          docs.push({
            name: docLabel,
            filename: f.filename || docLabel,
            fileUrl: resolvedUrl || "",
            dataUrl: directData || (isPhotoDoc && applicantPhoto ? applicantPhoto : undefined),
            previewUrl: directData || resolvedUrl || undefined,
            fileSize: f.fileSize || f.size || 0,
            uploadedAt: f.uploadedAt || f.date || raw?.created_at || new Date().toISOString(),
            status: "verified",
          })
        }
      } else {
        const docLabel = group.documentLabel || group.label || group.name || group.documentId || group.title || "Uploaded Document"
        const filename = group.filename || group.name || docLabel
        const isPhotoDoc = /2x2|photo|picture|1x1|id_pic|avatar/i.test(`${docLabel} ${filename}`)
        const directData =
          (group.dataUrl && !group.dataUrl.includes("/samples/"))
            ? group.dataUrl
            : (group.previewUrl && !group.previewUrl.includes("/samples/"))
            ? group.previewUrl
            : (group.base64 && !group.base64.includes("/samples/"))
            ? group.base64
            : (isPhotoDoc && applicantPhoto ? applicantPhoto : "")
        const resolvedUrl = directData || resolveFileUrl(group.fileUrl || group.url || group.path, filename, isChildWelfare)
        docs.push({
          name: docLabel,
          filename: filename,
          fileUrl: resolvedUrl || "",
          dataUrl: directData || (isPhotoDoc && applicantPhoto ? applicantPhoto : undefined),
          previewUrl: directData || resolvedUrl || undefined,
          fileSize: group.fileSize || group.size || 0,
          uploadedAt: group.uploadedAt || group.date || raw?.created_at || new Date().toISOString(),
          status: "verified",
        })
      }
    }
  }

  const seenKeys = new Set<string>()
  const uniqueDocs: ApplicationDocument[] = []
  for (const d of docs) {
    const key = (d.name || d.filename || "").trim().toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      uniqueDocs.push(d)
    }
  }

  // Fallback standard documents ONLY for legacy seeded demo rows (not real user submissions)
  if (uniqueDocs.length === 0 && raw?.is_sample) {
    if (isChildWelfare) {
      docs.push(
        {
          name: "PSA Birth Certificate of the Child",
          filename: "psa_birth_certificate.jpg",
          fileUrl: "/samples/BIRTH CERTIFICATE OF MINOR.jpg",
          fileSize: 39227,
          uploadedAt: raw?.created_at || new Date().toISOString(),
          status: "verified",
        },
        {
          name: "Valid ID of Parent/Guardian",
          filename: "valid_id_guardian.png",
          fileUrl: "/samples/sample_valid_id.png",
          fileSize: 262427,
          uploadedAt: raw?.created_at || new Date().toISOString(),
          status: "verified",
        }
      )
    } else {
      docs.push(
        {
          name: "Barangay Certificate of Solo Parent",
          filename: "barangay_certificate.webp",
          fileUrl: "/samples/BARANGAY CERTIFICATE.webp",
          fileSize: 32167,
          uploadedAt: raw?.created_at || new Date().toISOString(),
          status: "verified",
        },
        {
          name: "PSA Birth Certificate of Children",
          filename: "psa_birth_certificate.jpg",
          fileUrl: "/samples/BIRTH CERTIFICATE OF MINOR.jpg",
          fileSize: 39227,
          uploadedAt: raw?.created_at || new Date().toISOString(),
          status: "verified",
        }
      )
    }
  }

  return uniqueDocs.length > 0 ? uniqueDocs : docs
}

function safeDateIso(dateVal: any): string {
  if (!dateVal) return new Date().toISOString()
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function formatSafeDate(dateVal: any): string {
  if (!dateVal) return new Date().toLocaleDateString()
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString()
}

function formatSafeTime(dateVal: any): string {
  if (!dateVal) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const d = new Date(dateVal)
  return isNaN(d.getTime())
    ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatSafeDateTime(dateVal: any): string {
  if (!dateVal) return new Date().toLocaleString()
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString()
}

function mapSoloParentRow(row: any): SoloParentSubmission {
  if (!row) return {} as any
  const rawDate = row.submittedAt || row.created_at || row.submitted_at || row.dateSubmitted || row.date_submitted || row.updated_at
  const safeSubmittedAt = safeDateIso(rawDate)

  if (row.id && String(row.id).startsWith("SP-") && row.category === "Solo Parent") {
    return {
      ...row,
      submittedAt: safeSubmittedAt,
      documents: (row.uploaded_documents && Array.isArray(row.uploaded_documents) && row.uploaded_documents.length > 0)
        ? mapUploadedDocuments(row, false)
        : (Array.isArray(row.documents) && row.documents.length > 0 ? row.documents : mapUploadedDocuments(row, false)),
    }
  }

  const formData = parseJsonSafe(row.form_data, {})
  const extraData = parseJsonSafe(row.extra_data, {})
  const fdFormData = typeof formData.formData === "object" ? formData.formData : formData
  const familyMembers = Array.isArray(row.family_members)
    ? row.family_members
    : parseJsonSafe(row.family_members, parseJsonSafe(fdFormData.familyMembers || formData.familyMembers, []))

  const emFirst =
    fdFormData.emergencyFirstName ||
    formData.emergencyFirstName ||
    extraData.emergencyFirstName ||
    row.emergency_first_name ||
    row.emergencyFirstName ||
    ""

  const emLast =
    fdFormData.emergencyLastName ||
    formData.emergencyLastName ||
    extraData.emergencyLastName ||
    row.emergency_last_name ||
    row.emergencyLastName ||
    ""

  const emCombined = [emFirst, emLast].filter(Boolean).join(" ")

  let emergencyName =
    emCombined ||
    fdFormData.emergencyName ||
    fdFormData.emergencyContactPerson ||
    formData.emergencyName ||
    formData.emergencyContactPerson ||
    extraData.emergencyName ||
    row.emergency_name ||
    row.emergencyName ||
    ""

  let emergencyContactNo =
    fdFormData.emergencyContactNo ||
    fdFormData.emergencyPhone ||
    formData.emergencyContactNo ||
    formData.emergencyPhone ||
    extraData.emergencyContactNo ||
    row.emergency_contact_no ||
    row.emergency_phone ||
    row.emergencyContactNo ||
    ""

  let emergencyRelationship =
    fdFormData.emergencyRelationship ||
    formData.emergencyRelationship ||
    extraData.emergencyRelationship ||
    row.emergency_relationship ||
    row.relationshipToApplicant ||
    row.emergencyRelationship ||
    ""

  let emergencyAddress =
    fdFormData.emergencyAddress ||
    formData.emergencyAddress ||
    extraData.emergencyAddress ||
    row.emergency_address ||
    row.emergencyResidentialAddress ||
    row.emergencyAddress ||
    ""

  let bloodType =
    fdFormData.bloodType ||
    formData.bloodType ||
    extraData.bloodType ||
    row.blood_type ||
    row.bloodType ||
    "O+"

  const rawId = String(row.id || "").replace(/^SP-/, "")

  return {
    id: `SP-${rawId}`,
    submittedAt: safeSubmittedAt,
    referenceNumber: row.referenceNumber || row.reference_number || "",
    category: "Solo Parent",
    applicationType: row.applicationType || row.application_type || fdFormData.idStatus || formData.idStatus || "new",
    classification: row.classification || row.classification_title || fdFormData.selectedCategory?.title || formData.selectedCategory?.title || "Solo Parent Beneficiary",
    firstName: row.firstName || row.first_name || fdFormData.firstName || formData.firstName || "",
    middleName: row.middleName || row.middle_name || fdFormData.middleName || formData.middleName || "",
    lastName: row.lastName || row.last_name || fdFormData.lastName || formData.lastName || "",
    suffix: row.suffix || fdFormData.suffix || formData.suffix || "",
    age: row.age || (fdFormData.age ? parseInt(fdFormData.age, 10) : undefined) || (formData.age ? parseInt(formData.age, 10) : undefined),
    sex: row.sex || fdFormData.sex || formData.sex || "",
    dobMonth: row.dobMonth || row.dob_month || fdFormData.dobMonth || formData.dobMonth || "",
    dobDay: row.dobDay || row.dob_day || fdFormData.dobDay || formData.dobDay || "",
    dobYear: row.dobYear || row.dob_year || fdFormData.dobYear || formData.dobYear || "",
    placeOfBirth: row.placeOfBirth || row.place_of_birth || fdFormData.placeOfBirth || formData.placeOfBirth || "",
    educationalAttainment: row.educationalAttainment || row.educational_attainment || fdFormData.educationalAttainment || formData.educationalAttainment || "",
    occupation: row.occupation || fdFormData.occupation || formData.occupation || "",
    companyAgency: row.companyAgency || row.company_agency || fdFormData.companyAgency || formData.companyAgency || "",
    monthlyIncome: row.monthlyIncome || row.monthly_income || fdFormData.monthlyIncome || formData.monthlyIncome || "",
    totalFamilyIncome: row.totalFamilyIncome || row.total_family_income || fdFormData.totalFamilyIncome || formData.totalFamilyIncome || "",
    contactNo: row.contactNo || row.contact_no || fdFormData.contactNo || formData.contactNo || "",
    addressHouseNo: row.addressHouseNo || row.address_house_no || fdFormData.addressHouseNo || formData.addressHouseNo || "",
    addressStreet: row.addressStreet || row.address_street || fdFormData.addressStreet || formData.addressStreet || "",
    addressBarangay: row.addressBarangay || row.address_barangay || fdFormData.addressBarangay || formData.addressBarangay || "",
    addressCityMunicipality: row.addressCityMunicipality || row.address_city_municipality || fdFormData.addressCityMunicipality || formData.addressCityMunicipality || "QUEZON CITY",
    civilStatus: row.civilStatus || row.civil_status || fdFormData.civilStatus || formData.civilStatus || "",
    qcidNumber: row.qcidNumber || row.qcid_number || fdFormData.qcidNumber || formData.qcidNumber || "",
    email: row.email || fdFormData.email || formData.email || "",
    familyMembers: familyMembers || [],
    emergencyName: emergencyName,
    emergencyFirstName: emFirst,
    emergencyLastName: emLast,
    emergencyRelationship: emergencyRelationship,
    emergencyAddress: emergencyAddress,
    emergencyContactNo: emergencyContactNo,
    bloodType: bloodType,
    formData: formData,
    extraData: extraData,
    circumstanceDetails: row.circumstanceDetails || row.circumstance_details || formData.circumstanceDetails || "",
    needsProblems: row.needsProblems || row.needs_problems || formData.needsProblems || "",
    familyResources: row.familyResources || row.family_resources || formData.familyResources || "",
    documents: mapUploadedDocuments(row, false),
    status: row.status || row.application_status || "pending",
    soloParentIdNumber: row.soloParentIdNumber || row.solo_parent_id_number || row.assigned_id_number || undefined,
    assignedIdNumber: row.assignedIdNumber || row.assigned_id_number || row.solo_parent_id_number || undefined,
    applicantPhoto:
      row.applicantPhoto ||
      row.applicant_photo ||
      row.photoUrl ||
      row.photo_url ||
      row.idPhoto ||
      row.id_photo ||
      formData.applicantPhoto ||
      formData.idPhoto ||
      formData.photoUrl ||
      extraData.applicantPhoto ||
      extraData.photoUrl ||
      undefined,
    photoUrl:
      row.photoUrl ||
      row.applicantPhoto ||
      row.applicant_photo ||
      row.photo_url ||
      row.id_photo ||
      row.idPhoto ||
      formData.applicantPhoto ||
      formData.idPhoto ||
      formData.photoUrl ||
      extraData.applicantPhoto ||
      extraData.photoUrl ||
      undefined,
    rejectionReason: row.rejectionReason || row.rejection_reason || undefined,
    approvedBy: row.approvedBy ? String(row.approvedBy) : row.approved_by ? String(row.approved_by) : undefined,
    approvedDate: row.approvedDate || row.updated_at,
    notes: row.notes || row.admin_notes || undefined,
  }
}

function mapChildWelfareRow(row: any): ChildWelfareSubmission {
  if (!row) return {} as any
  const rawDate = row.submittedAt || row.created_at || row.submitted_at || row.dateSubmitted || row.date_submitted || row.updated_at
  const safeSubmittedAt = safeDateIso(rawDate)

  if (row.id && String(row.id).startsWith("CW-") && row.category === "Child Welfare") {
    return {
      ...row,
      submittedAt: safeSubmittedAt,
      documents: Array.isArray(row.documents) ? row.documents : mapUploadedDocuments(row, true),
    }
  }

  const rawId = String(row.id || "").replace(/^CW-/, "")

  return {
    id: `CW-${rawId}`,
    submittedAt: safeSubmittedAt,
    referenceNumber: row.referenceNumber || row.reference_number || "",
    category: "Child Welfare",
    supportCategory: row.supportCategory || row.category_title || "",
    guardianFirstName: row.guardianFirstName || row.guardian_first_name || "",
    guardianMiddleName: row.guardianMiddleName || row.guardian_middle_name || "",
    guardianLastName: row.guardianLastName || row.guardian_last_name || "",
    guardianSex: row.guardianSex || row.guardian_sex || "",
    guardianDateOfBirth: row.guardianDateOfBirth || row.guardian_date_of_birth || "",
    guardianAge: row.guardianAge || row.guardian_age,
    guardianCivilStatus: row.guardianCivilStatus || row.guardian_civil_status || "",
    guardianRelationshipToChild: row.guardianRelationshipToChild || row.guardian_relationship_to_child || "",
    guardianContactNo: row.guardianContactNo || row.guardian_contact_no || "",
    guardianEmail: row.guardianEmail || row.guardian_email || "",
    guardianValidId: row.guardianValidId || row.guardian_valid_id || "",
    addressHouseNo: row.addressHouseNo || row.address_house_no || "",
    addressStreet: row.addressStreet || row.address_street || "",
    addressBarangay: row.addressBarangay || row.address_barangay || "",
    addressCityMunicipality: row.addressCityMunicipality || row.address_city_municipality || "QUEZON CITY",
    childName: row.childName || row.child_name || "",
    childSex: row.childSex || row.child_sex || "",
    childBirthday: row.childBirthday || row.child_birthday || "",
    childAge: row.childAge || row.child_age,
    childSchoolDaycare: row.childSchoolDaycare || row.child_school_daycare || "",
    childBirthCertificate: row.childBirthCertificate || row.child_birth_certificate || "",
    childGradeLevel: row.childGradeLevel || row.child_grade_level || "",
    childSchoolAddress: row.childSchoolAddress || row.child_school_address || "",
    childEnrollmentStatus: row.childEnrollmentStatus || row.child_enrollment_status || "",
    childSpecialNeeds: row.childSpecialNeeds || row.child_special_needs || "",
    childSpecialNeedsSpecify: row.childSpecialNeedsSpecify || row.child_special_needs_specify || "",
    householdMembers: row.householdMembers || row.household_members || [],
    childrenStudying: row.childrenStudying || row.children_studying,
    monthlyHouseholdIncome: row.monthlyHouseholdIncome || row.monthly_household_income || "",
    mainSourceIncome: row.mainSourceIncome || row.main_source_income || "",
    employmentStatus: row.employmentStatus || row.employment_status || "",
    otherFinancialSupport: row.otherFinancialSupport || row.other_financial_support || "",
    supportTypes: row.supportTypes || row.support_types || [],
    supportOther: row.supportOther || row.support_other || "",
    primaryReasonForAssistance: row.primaryReasonForAssistance || row.primary_reason_for_assistance || "",
    specificNeeds: row.specificNeeds || row.specific_needs || "",
    estimatedAmountNeeded: row.estimatedAmountNeeded || row.estimated_amount_needed || "",
    urgency: row.urgency || "",
    childLivingArrangement: row.childLivingArrangement || row.child_living_arrangement || "",
    otherChildrenNeedingAssistance: row.otherChildrenNeedingAssistance || row.other_children_needing_assistance || "",
    otherChildrenCount: row.otherChildrenCount || row.other_children_count,
    otherGovtAssistanceReceived: row.otherGovtAssistanceReceived || row.other_govt_assistance_received || "",
    otherGovtProgram: row.otherGovtProgram || row.other_govt_program || "",
    additionalInfo: row.additionalInfo || row.additional_info || "",
    isReportingPersonCurrentParent: row.isReportingPersonCurrentParent || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      if (fdForm.isReportingPersonCurrentParent || fd.isReportingPersonCurrentParent) return fdForm.isReportingPersonCurrentParent || fd.isReportingPersonCurrentParent
      const addInfo = row.additional_info || ""
      if (addInfo.includes("Reporting Person is Current Parent/Guardian: No")) return "No"
      if (addInfo.includes("Reporting Person is Current Parent/Guardian: Yes")) return "Yes"
      return "Yes"
    })(),
    specifiedRelationship: row.specifiedRelationship || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      if (fdForm.specifiedRelationship || fd.specifiedRelationship) return fdForm.specifiedRelationship || fd.specifiedRelationship
      const addInfo = row.additional_info || ""
      const match = addInfo.match(/\(Specified:\s*([^)]+)\)/)
      return match ? match[1] : ""
    })(),
    isImmediateDanger: row.isImmediateDanger || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      if (fdForm.isImmediateDanger || fd.isImmediateDanger) return fdForm.isImmediateDanger || fd.isImmediateDanger
      const addInfo = row.additional_info || ""
      if (addInfo.includes("Immediate Danger: Yes")) return "Yes"
      if (addInfo.includes("Immediate Danger: No")) return "No"
      return "No"
    })(),
    isChildSafe: row.isChildSafe || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      if (fdForm.isChildSafe || fd.isChildSafe) return fdForm.isChildSafe || fd.isChildSafe
      const addInfo = row.additional_info || ""
      if (addInfo.includes("Child Currently in Safe Location: Yes")) return "Yes"
      if (addInfo.includes("Child Currently in Safe Location: No")) return "No"
      return "Yes"
    })(),
    emergencyType: row.emergencyType || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      return fdForm.emergencyType || fd.emergencyType || (row as any).emergency_type || ""
    })(),
    emergencyDate: row.emergencyDate || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      return fdForm.emergencyDate || fd.emergencyDate || ""
    })(),
    emergencyTime: row.emergencyTime || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      return fdForm.emergencyTime || fd.emergencyTime || ""
    })(),
    emergencyDateTime: row.emergencyDateTime || (() => {
      const rawFd = row.form_data || {}
      const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
      const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
      return [fdForm.emergencyDate, fdForm.emergencyTime].filter(Boolean).join(" at ") || fdForm.emergencyDateTime || fd.emergencyDateTime || ""
    })(),
    documents: mapUploadedDocuments(row, true),
    status: row.status || row.application_status || "pending",
    approvedAmount: row.approvedAmount || row.approved_amount || undefined,
    rejectionReason: row.rejectionReason || row.rejection_reason || undefined,
    approvedBy: row.approvedBy ? String(row.approvedBy) : row.approved_by ? String(row.approved_by) : undefined,
    approvedDate: row.approvedDate || row.updated_at,
    notes: row.notes || row.admin_notes || undefined,
  }
}

async function fetchAllSubmissions(): Promise<WelfareSubmission[]> {
  let soloApps: SoloParentSubmission[] = []
  let childApps: ChildWelfareSubmission[] = []
  let backendFetched = false

  try {
    const [soloData, childData] = await Promise.all([
      cachedApiFetch<any>(`${API_BASE}/api/solo-parent/admin/all?limit=200`, { headers: authHeaders() }, 4000).catch(() => null),
      cachedApiFetch<any>(`${API_BASE}/api/child-welfare/admin/all?limit=200`, { headers: authHeaders() }, 4000).catch(() => null),
    ])

    if (soloData) {
      const rawSolo = Array.isArray(soloData) ? soloData : soloData.applications || []
      soloApps = rawSolo.map(mapSoloParentRow)
      backendFetched = true
    }
    if (childData) {
      const rawChild = Array.isArray(childData) ? childData : childData.applications || []
      childApps = rawChild.map(mapChildWelfareRow)
      backendFetched = true
    }
  } catch (e) {
    console.warn("API fetch error in welfare admin:", e)
  }

  // If backend returned data, save fresh copy to localStorage
  if (backendFetched) {
    try {
      localStorage.setItem("solo_parent_applications", JSON.stringify(soloApps))
      localStorage.setItem("child_welfare_applications", JSON.stringify(childApps))
    } catch {}
  } else {
    // Only use localStorage if backend was completely offline
    try {
      const localSolo = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
      if (Array.isArray(localSolo) && localSolo.length > 0) {
        soloApps = localSolo.map(mapSoloParentRow)
      }
      const localChild = JSON.parse(localStorage.getItem("child_welfare_applications") || "[]")
      if (Array.isArray(localChild) && localChild.length > 0) {
        childApps = localChild.map(mapChildWelfareRow)
      }
    } catch {}
  }

  return [...soloApps, ...childApps].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )
}

async function approveSubmission(app: WelfareSubmission, value: string) {
  const isSolo = isSoloParent(app)
  const rawId = app.id.replace(/^(SP|CW)-/, "")
  const idOrRef = app.referenceNumber || rawId
  const url = isSolo
    ? `${API_BASE}/api/solo-parent/${encodeURIComponent(idOrRef)}/admin/update-status`
    : `${API_BASE}/api/child-welfare/${encodeURIComponent(idOrRef)}/admin/update-status`

  const body = isSolo
    ? { status: "approved", assignedIdNumber: value, soloParentIdNumber: value, referenceNumber: app.referenceNumber }
    : { status: "approved", approvedAmount: value, referenceNumber: app.referenceNumber }

  const res = await fetch(url, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || "Failed to approve application")
  }
}

async function rejectSubmission(app: WelfareSubmission, reason: string) {
  const isSolo = isSoloParent(app)
  const rawId = app.id.replace(/^(SP|CW)-/, "")
  const idOrRef = app.referenceNumber || rawId
  const url = isSolo
    ? `${API_BASE}/api/solo-parent/${encodeURIComponent(idOrRef)}/admin/update-status`
    : `${API_BASE}/api/child-welfare/${encodeURIComponent(idOrRef)}/admin/update-status`

  const res = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "rejected", rejectionReason: reason, referenceNumber: app.referenceNumber }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || "Failed to reject application")
  }
}

const Tokens = React.memo(function Tokens() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

      /* Palette, radius and shadow tokens lifted from the GOVCHECK / UPZH WEB
         frontend design review: cool light-gray canvas, white cards, deep-navy
         text, blue primary actions, semantic success/warning/info/destructive,
         rounded-xl/2xl surfaces and soft elevation. Structure (pennant tag /
         stamp dot / numbered sections) is unchanged — only color + surface. */
      .gw-root{
        --ink:#0f172a; --ink-soft:#6b7280; --ink-faint:#94a3b8;
        --paper:#f9fafb; --surface:#ffffff; --surface-sunk:#f1f3f5;
        --line:#e5e7eb; --line-soft:#eef0f2;
        --plum:#2563eb; --plum-ink:#1d4ed8; --plum-soft:#eaf1ff; --plum-line:#c7dbff;
        --brick:#0ea5e9; --brick-ink:#0284c7; --brick-soft:#e6f6fd; --brick-line:#bae6fd;
        --gold:#f59e0b; --gold-ink:#b45309; --gold-soft:#fef6e7; --gold-line:#fde7be;
        --forest:#22c55e; --forest-ink:#15803d; --forest-soft:#e9fbef; --forest-line:#bbf7d0;
        --redwood:#ef4444; --redwood-ink:#b91c1c; --redwood-soft:#fdeded; --redwood-line:#fcc9c9;
        --shadow-soft:0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06);
        --shadow-medium:0 4px 6px rgba(15,23,42,.05), 0 10px 15px rgba(15,23,42,.08);
        font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
        min-height: 100%;
      }

      .dark .gw-root,
      html.dark .gw-root,
      body.dark .gw-root {
        --ink: #f1f5f9; --ink-soft: #94a3b8; --ink-faint: #64748b;
        --paper: hsl(222, 47%, 8%); --surface: hsl(222, 40%, 12%); --surface-sunk: hsl(222, 35%, 16%);
        --line: hsl(222, 30%, 20%); --line-soft: hsl(222, 30%, 24%);
        --plum-soft: rgba(37, 99, 235, 0.25); --plum-line: rgba(37, 99, 235, 0.4);
        --brick-soft: rgba(2, 132, 199, 0.25); --brick-line: rgba(2, 132, 199, 0.4);
        --gold-soft: rgba(245, 158, 11, 0.25); --gold-line: rgba(245, 158, 11, 0.4);
        --forest-soft: rgba(34, 197, 94, 0.25); --forest-line: rgba(34, 197, 94, 0.4);
        --redwood-soft: rgba(239, 68, 68, 0.25); --redwood-line: rgba(239, 68, 68, 0.4);
        color: var(--ink); background: var(--paper);
      }
      .gw-serif{ font-family:'Plus Jakarta Sans',sans-serif; font-weight:600; letter-spacing:-0.01em; }
      .gw-mono{ font-family:'Inter',sans-serif; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }

      .gw-eyebrow{ font-family:'Inter',sans-serif; font-size:.68rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-faint); }

      /* pennant tag — encodes case TYPE */
      .gw-tag{ display:inline-flex; align-items:center; gap:.4rem; padding:.34rem .85rem .34rem .65rem; font-size:.68rem; font-weight:600; letter-spacing:.03em; text-transform:uppercase; color:#fff; white-space:nowrap; clip-path:polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%); }
      .gw-tag--solo{ background:var(--plum); }
      .gw-tag--child{ background:var(--brick); }
      .gw-tag--ghost{ background:var(--surface-sunk); color:var(--ink-soft); border:1px solid var(--line); clip-path:none; padding:.34rem .7rem; border-radius:8px; }
      .gw-tag--btn{ cursor:pointer; border:none; opacity:.5; transition:opacity .15s, transform .1s; }
      .gw-tag--btn:hover{ opacity:.8; }
      .gw-tag--btn.is-active{ opacity:1; }

      /* stamp dot — encodes case DECISION */
      .gw-dot{ width:18px; height:18px; border-radius:50%; flex-shrink:0; display:inline-block; }
      .gw-dot--pending{ background:var(--gold-soft); border:2px dashed var(--gold); }
      .gw-dot--approved{ background:var(--forest); }
      .gw-dot--rejected{ background:var(--redwood); }
      .gw-dot--revision{ background:var(--surface); border:2px dashed var(--ink-faint); }

      .gw-status{ display:inline-flex; align-items:center; gap:.5rem; font-size:.76rem; font-weight:600; }
      .gw-status--pending{ color:var(--gold-ink); }
      .gw-status--approved{ color:var(--forest-ink); }
      .gw-status--rejected{ color:var(--redwood-ink); }
      .gw-status--revision{ color:var(--ink-soft); }

      .gw-card{ background:var(--surface); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow-soft); transition:box-shadow .15s ease, transform .15s ease; }
      .gw-card:hover{ box-shadow:var(--shadow-medium); transform:translateY(-1px); }
      .gw-card--solo{ }
      .gw-card--child{ }

      .gw-avatar{ display:flex; align-items:center; justify-content:center; border-radius:12px; color:#fff; font-family:'Plus Jakarta Sans',sans-serif; font-weight:600; }
      .gw-avatar--solo{ background:linear-gradient(135deg, var(--plum), var(--plum-ink)); }
      .gw-avatar--child{ background:linear-gradient(135deg, var(--brick), var(--brick-ink)); }

      .gw-btn-primary{ background:var(--plum); color:#fff; border:1px solid var(--plum); border-radius:12px; font-weight:600; box-shadow:var(--shadow-soft); transition:background .15s, transform .15s; }
      .gw-btn-primary:hover{ background:var(--plum-ink); transform:translateY(-1px); }
      .gw-btn-ghost{ background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:12px; font-weight:600; transition:background .15s, transform .15s; }
      .gw-btn-ghost:hover{ background:var(--surface-sunk); transform:translateY(-1px); }
      .gw-btn-approve{ background:var(--forest); color:#fff; border:1px solid var(--forest); border-radius:12px; font-weight:600; box-shadow:var(--shadow-soft); transition:background .15s, transform .15s; }
      .gw-btn-approve:hover{ background:var(--forest-ink); transform:translateY(-1px); }
      .gw-btn-reject{ background:var(--redwood); color:#fff; border:1px solid var(--redwood); border-radius:12px; font-weight:600; box-shadow:var(--shadow-soft); transition:background .15s, transform .15s; }
      .gw-btn-reject:hover{ background:var(--redwood-ink); transform:translateY(-1px); }

      .gw-input{ background:var(--surface-sunk); border:1px solid var(--line); border-radius:10px; color:var(--ink); }
      .gw-input:focus{ outline:none; border-color:var(--plum); box-shadow:0 0 0 3px var(--plum-soft); }
      .gw-input::placeholder{ color:var(--ink-faint); }

      .gw-section-num{ font-family:'Inter',sans-serif; font-weight:700; font-size:.68rem; color:var(--plum-ink); background:var(--plum-soft); padding:.2rem .5rem; border-radius:6px; }
      .gw-section-rule{ height:1px; background:var(--line); flex:1; }

      .gw-stat{ background:var(--surface); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow-soft); }
    `}</style>
  )
  })

function displayName(app: WelfareSubmission) {
  if (isSoloParent(app)) {
    return [app.firstName, app.middleName, app.lastName, app.suffix]
      .filter(Boolean)
      .filter((s) => s !== "null" && s !== "undefined")
      .join(" ")
  }
  const child = (app as ChildWelfareSubmission).childName || (app as any).child_name
  if (child && String(child).trim()) {
    return String(child).trim()
  }
  return [app.guardianFirstName, app.guardianMiddleName, app.guardianLastName]
    .filter(Boolean)
    .filter((s) => s !== "null" && s !== "undefined")
    .join(" ")
}

function initials(app: WelfareSubmission) {
  const name = displayName(app) || ""
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return isSoloParent(app) ? "SP" : "CW"
}
function AvatarCircle({
  app,
  sizeClass = "h-11 w-11",
}: {
  app: WelfareSubmission
  sizeClass?: string
}) {
  return (
    <div
      className={`${sizeClass} shrink-0 gw-avatar ${
        isSoloParent(app) ? "gw-avatar--solo" : "gw-avatar--child"
      } text-sm font-bold flex items-center justify-center`}
    >
      {initials(app)}
    </div>
  )
}

function getAddress(app: WelfareSubmission) {
  return `${[app.addressHouseNo, app.addressStreet].filter(Boolean).join(" ")}, Brgy. ${app.addressBarangay}, ${app.addressCityMunicipality}`
}

function isPdfFile(filename?: string, fileUrl?: string) {
  const target = `${filename || ""} ${fileUrl || ""}`.toLowerCase()
  if (fileUrl?.startsWith("data:application/pdf")) return true
  return /\.pdf($|\?)/i.test(target)
}

function isImageFile(filename?: string, fileUrl?: string) {
  const target = `${filename || ""} ${fileUrl || ""}`.toLowerCase()
  if (fileUrl?.startsWith("data:image")) return true
  if (isPdfFile(filename, fileUrl)) return false
  return /\.(jpe?g|png|webp|gif|svg|avif|bmp)($|\?)/i.test(target) || !target.includes(".")
}

function getDocumentCandidateUrls(doc: ApplicationDocument, app?: WelfareSubmission | null): string[] {
  const isChild = app?.category === "Child Welfare" || (app as any)?.type === "child"
  const urls: string[] = []

  const add = (u?: string) => {
    if (!u || typeof u !== "string") return
    let resolved = u.trim()
    if (!resolved || resolved.includes("/samples/")) return
    if (resolved.startsWith("data:") || resolved.startsWith("blob:")) {
      if (!urls.includes(resolved)) {
        // Prioritize instant Base64 data URLs at the beginning
        urls.unshift(resolved)
      }
      return
    }
    resolved = resolveFileUrl(resolved, doc.filename, isChild)
    if (resolved && !urls.includes(resolved)) {
      urls.push(resolved)
    }
  }

  const isPhotoDoc = Boolean(/2x2|photo|picture|1x1|id_pic|avatar/i.test(`${doc.name} ${doc.filename || ""}`))

  // 1. Direct fileUrl / previewUrl / dataUrl from doc
  if (doc.dataUrl && !doc.dataUrl.includes("/samples/")) add(doc.dataUrl)
  if (doc.previewUrl && !doc.previewUrl.includes("/samples/")) add(doc.previewUrl)
  if (doc.fileUrl && !doc.fileUrl.includes("/samples/")) add(doc.fileUrl)

  // 2. Search app object (formData, extraData, uploaded_documents, documents)
  if (app) {
    const rawDocs: any[] = []
    if (Array.isArray(app.documents)) rawDocs.push(...app.documents)
    if (Array.isArray((app as any).uploaded_documents)) rawDocs.push(...(app as any).uploaded_documents)
    if (Array.isArray((app as any).form_data?.uploaded_documents)) rawDocs.push(...(app as any).form_data.uploaded_documents)
    if (Array.isArray((app as any).form_data?.documents)) rawDocs.push(...(app as any).form_data.documents)
    if (Array.isArray((app as any).extraData?.documents)) rawDocs.push(...(app as any).extraData.documents)

    const targetDocName = (doc.name || doc.filename || "").toLowerCase()
    for (const d of rawDocs) {
      if (!d) continue
      const dName = String(d.name || d.documentLabel || d.documentId || d.filename || "").toLowerCase()
      if (dName && targetDocName && (dName === targetDocName || dName.includes(targetDocName) || targetDocName.includes(dName))) {
        if (d.dataUrl) add(d.dataUrl)
        if (d.previewUrl) add(d.previewUrl)
        if (d.fileUrl) add(d.fileUrl)
        if (Array.isArray(d.files)) {
          for (const f of d.files) {
            if (f.dataUrl) add(f.dataUrl)
            if (f.previewUrl) add(f.previewUrl)
            if (f.fileUrl) add(f.fileUrl)
          }
        }
      }
    }
  }

  // 3. PWD Logic: Check localStorage for real user upload records across all application stores
  try {
    const localKeys = [
      "solo_parent_applications",
      "child_welfare_applications",
      "pwd_senior_applications",
      "applications",
      "all_user_applications",
      "active_applications",
    ]
    const targetRef = String(app?.referenceNumber || (app as any)?.reference_number || app?.id || "").trim().toLowerCase()
    const targetDocName = String(doc.name || doc.filename || "").trim().toLowerCase()

    for (const key of localKeys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const match = parsed.find((a: any) => {
            if (!a) return false
            const aRef = String(a.referenceNumber || a.reference_number || a.id || a.qcid || "").trim().toLowerCase()
            return targetRef && aRef && (aRef === targetRef || aRef.includes(targetRef) || targetRef.includes(aRef))
          })
          if (match) {
            const matchDocs = match.documents || match.uploaded_documents || match.form_data?.documents || []
            for (const md of matchDocs) {
              if (!md) continue
              const mdName = String(md.name || md.documentLabel || md.documentId || md.filename || "").toLowerCase()
              if (mdName && targetDocName && (mdName === targetDocName || mdName.includes(targetDocName) || targetDocName.includes(mdName))) {
                if (md.dataUrl) add(md.dataUrl)
                if (md.previewUrl) add(md.previewUrl)
                if (md.fileUrl) add(md.fileUrl)
                if (Array.isArray(md.files)) {
                  for (const f of md.files) {
                    if (f.dataUrl) add(f.dataUrl)
                    if (f.previewUrl) add(f.previewUrl)
                    if (f.fileUrl) add(f.fileUrl)
                  }
                }
              }
            }
          }
        }
      } catch {}
    }
  } catch {}

  // 4. Server filename URL
  if (doc.filename && !doc.filename.toLowerCase().startsWith("sample")) {
    const fn = doc.filename.replace(/^.*[\\\/]/, "").trim()
    if (fn) {
      const folder = isChild ? "child-welfare" : "solo-parent"
      add(`${API_BASE}/uploads/${folder}/${encodeURIComponent(fn)}`)
      add(`${API_BASE}/uploads/${encodeURIComponent(fn)}`)
    }
  }

  // 5. If photo doc, try applicant photo from app object
  if (isPhotoDoc && app) {
    const appPhoto = getApplicantPhotoUrl(app)
    if (appPhoto && !appPhoto.includes("/samples/")) add(appPhoto)
    if (app.applicantPhoto && !app.applicantPhoto.includes("/samples/")) add(app.applicantPhoto)
    if (app.photoUrl && !app.photoUrl.includes("/samples/")) add(app.photoUrl)
  }

  return urls
}

function DocumentPreviewModal({
  doc,
  app,
  onClose,
}: {
  doc: ApplicationDocument | null
  app?: WelfareSubmission | null
  onClose: () => void
}) {
  if (!doc) return null

  const candidates = React.useMemo(() => getDocumentCandidateUrls(doc, app), [doc, app])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    setCandidateIndex(0)
    setIsZoomed(false)
  }, [doc, app])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const currentSrc = candidates[candidateIndex] || ""
  const hasError = !currentSrc || candidateIndex >= candidates.length

  const isPdf = isPdfFile(doc.filename, currentSrc)
  const isImg = isImageFile(doc.filename, currentSrc)

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1)
    } else {
      setCandidateIndex(candidates.length)
    }
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{doc.name}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {doc.filename || doc.name} {doc.fileSize ? `• ${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors text-xl font-semibold leading-none cursor-pointer"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content Viewer */}
        <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-100/70 min-h-[380px] max-h-[65vh]">
          {isPdf ? (
            <iframe
              src={currentSrc}
              title={doc.name}
              className="w-full h-[58vh] rounded-xl border border-gray-200 bg-white shadow-xs"
            />
          ) : isImg && !hasError ? (
            <div className="relative group max-h-full flex items-center justify-center">
              <img
                src={currentSrc}
                alt={doc.name}
                onError={handleImageError}
                onClick={() => setIsZoomed((prev) => !prev)}
                className={`rounded-xl border border-border shadow-sm object-contain bg-white transition-transform duration-200 cursor-zoom-${isZoomed ? "out" : "in"} ${
                  isZoomed ? "max-h-[85vh] scale-125" : "max-h-[55vh] max-w-full"
                }`}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center text-muted-foreground w-full max-w-sm border border-border shadow-xs">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
              <p className="text-xs mt-1 text-gray-500">Document preview on file.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4 shrink-0 bg-white">
          <a
            href={currentSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 h-10 inline-flex items-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold tracking-wide transition-colors"
          >
            OPEN IN NEW TAB
          </a>
          <button
            onClick={onClose}
            className="px-6 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer shadow-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

function docIcon(fileName: string) {
  const isImage = isImageFile(fileName)
  return isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />
}

const docStatusMeta = {
  verified: { dot: "gw-dot--approved", text: "gw-status--approved" },
  pending: { dot: "gw-dot--pending", text: "gw-status--pending" },
  rejected: { dot: "gw-dot--rejected", text: "gw-status--rejected" },
} as const

const statusMeta = {
  pending: { dot: "gw-dot--pending", text: "gw-status--pending", label: "Pending" },
  approved: { dot: "gw-dot--approved", text: "gw-status--approved", label: "Approved" },
  rejected: { dot: "gw-dot--rejected", text: "gw-status--rejected", label: "Rejected" },
  needs_revision: { dot: "gw-dot--revision", text: "gw-status--revision", label: "Needs Revision" },
} as const


function StatusBadge({ status }: { status: WelfareSubmission["status"] }) {
  const m = statusMeta[status] ?? statusMeta.pending
  return (
    <span className={`gw-status ${m.text}`}>
      <span className={`gw-dot ${m.dot}`} />
      {m.label}
    </span>
  )
}
function CategoryTag({ category }: { category: WelfareSubmission["category"] }) {
  return <span className={`gw-tag ${category === "Solo Parent" ? "gw-tag--solo" : "gw-tag--child"}`}>{category}</span>
}



function SectionHeading({ icon, number, children }: { icon: React.ReactNode; number: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="gw-section-num">{number}</span>
      <span style={{ color: "var(--ink-faint)" }}>{icon}</span>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>{children}</h3>
      <span className="gw-section-rule" />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{label}</p>
      <p className="font-medium mt-1 text-sm" style={{ color: "var(--ink)" }}>{value || "—"}</p>
    </div>
  )
}

// =====================================================================================
// Application card (list row)
// =====================================================================================

interface CardProps {
  app: WelfareSubmission
  onView: (app: WelfareSubmission) => void
  onShowCard?: (app: WelfareSubmission) => void
  allSubmissions?: WelfareSubmission[]
}

function ApplicationCard({ app, onView, onShowCard, allSubmissions }: CardProps) {
  const subLabel = isSoloParent(app)
    ? (app as any).applicationType === "new" ? "New application" : (app as any).applicationType === "renewal" ? "Renewal" : "Lost ID replacement"
    : app.supportCategory.replace(/^\d+\.\s*/, "")

  const soloOfficialId = isSoloParent(app) && app.status === "approved"
    ? (app as any).assignedIdNumber || (app as any).soloParentIdNumber || generateOfficialSoloParentId(app, allSubmissions)
    : ""

  return (
    <div
      onClick={() => onView(app)}
      className={`gw-card ${isSoloParent(app) ? "gw-card--solo" : "gw-card--child"} p-4 transition-shadow hover:shadow-sm cursor-pointer`}
    >
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex">
          <AvatarCircle app={app} sizeClass="h-11 w-11 flex items-center justify-center" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="gw-serif text-base font-semibold" style={{ color: "var(--ink)" }}>{displayName(app)}</p>
            <CategoryTag category={app.category} />
            <span className="gw-tag gw-tag--ghost truncate max-w-56">{subLabel}</span>
          </div>
          <p className="gw-mono text-xs mb-1" style={{ color: "var(--ink-faint)" }}>REF {app.referenceNumber}</p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-soft)" }}>
            Submitted {formatSafeDate(app.submittedAt)} · {formatSafeTime(app.submittedAt)}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
              <Paperclip className="h-3.5 w-3.5" />
              {app.documents.length} documents
            </span>
            {isSoloParent(app)
              ? app.status === "approved" && soloOfficialId && (
                  <span className="gw-mono text-xs font-semibold" style={{ color: "var(--forest-ink)" }}>
                    ID {soloOfficialId}
                  </span>
                )
              : app.status === "approved" && (app as any).approvedAmount && (
                  <span className="gw-mono text-xs font-semibold" style={{ color: "var(--forest-ink)" }}>
                    ₱{(app as any).approvedAmount} approved
                  </span>
                )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={app.status} />
          {onShowCard && app.status === "approved" && isSoloParent(app) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onShowCard(app)
              }}
              className="gw-btn-ghost px-2.5 py-1 text-xs text-blue-700 hover:text-blue-800 border-blue-200 bg-blue-50/60 inline-flex items-center gap-1 cursor-pointer"
            >
              <IdCard className="h-3.5 w-3.5 text-blue-600" />
              View ID
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


function getStableSequence(refOrId: string): string {
  let hash = 0
  for (let i = 0; i < refOrId.length; i++) {
    hash = (hash << 5) - hash + refOrId.charCodeAt(i)
    hash |= 0
  }
  const positive = Math.abs(hash)
  return String(100000 + (positive % 900000))
}

function generateOfficialSoloParentId(app: WelfareSubmission, allSubmissions?: WelfareSubmission[]): string {
  if ((app as any).assignedIdNumber && String((app as any).assignedIdNumber).trim().startsWith("SP-")) {
    return String((app as any).assignedIdNumber).trim()
  }
  if ((app as any).soloParentIdNumber && String((app as any).soloParentIdNumber).trim().startsWith("SP-")) {
    return String((app as any).soloParentIdNumber).trim()
  }

  const rawType = String((app as any).applicationType || (app as any).type || "").toLowerCase()
  const isRenewalOrLoss =
    rawType.includes("renewal") ||
    rawType.includes("loss") ||
    rawType.includes("replacement")

  const year = new Date().getFullYear()
  const stableSeq = getStableSequence(app.referenceNumber || app.id || "110000")

  if (isRenewalOrLoss) {
    const candidateFields = [
      (app as any).existingIdNumber,
      (app as any).soloParentIdNumber,
      (app as any).existingSoloParentIdNumber,
      (app as any).assignedIdNumber,
      (app as any).idNumber,
    ]
    for (const c of candidateFields) {
      if (c && typeof c === "string") {
        const s = c.trim()
        if (s && s !== "—" && !s.startsWith("110000") && (s.startsWith("SP-") || s.length >= 6)) {
          return s
        }
      }
    }

    // Check pool
    let pool: any[] = allSubmissions || []
    if (!pool.length) {
      try {
        const raw = localStorage.getItem("all_user_applications") || localStorage.getItem("applications")
        if (raw) pool = JSON.parse(raw)
      } catch {}
    }

    const appEmail = String((app as any).email || (app as any).guardianEmail || "").trim().toLowerCase()
    const appRef = String(app.referenceNumber || (app as any).reference_no || "").trim().toLowerCase()
    const appName = `${(app as any).firstName || (app as any).guardianFirstName || ""} ${(app as any).lastName || (app as any).guardianLastName || ""}`.trim().toLowerCase()

    if (Array.isArray(pool)) {
      const match = pool.find((a) => {
        if (!a || a.id === app.id) return false
        const aIsSolo = isSoloParent(a)
        if (!aIsSolo) return false
        const isApproved = a.status === "approved" || String(a.status) === "completed"
        const assigned = (a as any).assignedIdNumber || (a as any).soloParentIdNumber
        if (!isApproved || !assigned) return false

        const aEmail = String((a as any).email || (a as any).guardianEmail || "").trim().toLowerCase()
        const aRef = String(a.referenceNumber || (a as any).reference_no || "").trim().toLowerCase()
        const aName = `${(app as any).firstName || (app as any).guardianFirstName || ""} ${(app as any).lastName || (app as any).guardianLastName || ""}`.trim().toLowerCase()

        return (
          (appEmail && aEmail && appEmail === aEmail) ||
          (appRef && aRef && (appRef === aRef || appRef.includes(aRef) || aRef.includes(appRef))) ||
          (appName && aName && appName === aName)
        )
      })

      if (match) {
        const assigned = (match as any).assignedIdNumber || (match as any).soloParentIdNumber
        if (assigned) return String(assigned).trim()
      }
    }

    if (appRef.startsWith("sp-")) {
      return appRef.toUpperCase()
    }
  }

  return `SP-137404-${year}-${stableSeq}`
}


function SoloParentCardFront({
  app,
  photoUrl,
  idNumber,
  appDate,
  expiryDateStr,
  cardRef,
}: {
  app: WelfareSubmission
  photoUrl: string
  idNumber: string
  appDate: string
  expiryDateStr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none flex flex-col justify-between"
      style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #eff6ff 100%)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Header */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between text-white bg-gradient-to-r from-red-700 via-red-600 to-red-800 shadow-xs"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="flex items-center gap-2">
          <img src="/gov-serves-seal.png" alt="QC Seal" crossOrigin="anonymous" className="w-7 h-7 object-contain drop-shadow-xs rounded-full bg-white/20 p-0.5" />
          <div>
            <p className="text-[7.5px] font-bold tracking-widest uppercase opacity-90 leading-tight">Republic of the Philippines</p>
            <p className="text-xs font-black tracking-wide leading-tight uppercase">GOV SERVICES</p>
          </div>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          SOLO PARENT ID
        </span>
      </div>

      {/* Sub-header */}
      <div
        className="py-1 text-center text-[9.5px] font-black uppercase tracking-widest bg-amber-400 text-slate-950"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        Social Services Development Department — Solo Parent Welfare
      </div>

      {/* Details with QC Logo on right side */}
      <div className="p-3 flex gap-2.5 items-start relative">
        <ApplicantPhotoDisplay
          photoUrl={photoUrl}
          tag="QC SSDD"
        />

        <div className="flex-1 min-w-0 space-y-1 relative z-10">
          <div>
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">QC Solo Parent ID</span>
            <p className="text-sm font-black text-red-700 font-mono tracking-wide leading-none">{idNumber}</p>
          </div>

          <div className="pt-0.5">
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">Cardholder Full Name</span>
            <p className="text-xs font-black text-slate-900 leading-tight uppercase truncate">{displayName(app)}</p>
          </div>

          <div className="pt-0.5">
            <span className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider">Classification</span>
            <p className="text-[9.5px] font-bold text-emerald-800 leading-tight truncate">{(app as any).classification || (app as any).selectedCategory || "Solo Parent Beneficiary"}</p>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-0.5 text-[8.5px] text-slate-700">
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Birthdate:</span> {(app as any).dobYear ? `${(app as any).dobYear}-${(app as any).dobMonth || "01"}-${(app as any).dobDay || "01"}` : "—"}
            </div>
            <div>
              <span className="text-[7px] font-semibold text-slate-400 uppercase">Children:</span> {(app as any).familyMembers?.length || 1} Dependent(s)
            </div>
          </div>

          <div className="text-[8.5px] text-slate-700 truncate pt-0.5">
            <span className="text-[7px] font-semibold text-slate-400 uppercase">Address:</span> {getAddress(app)}
          </div>
        </div>

        {/* QC Official Logo on the right side */}
        <div className="shrink-0 flex flex-col items-center justify-center pl-1 z-10 self-center">
          <img
            src="/gov-serves-seal.png"
            alt="QC Official Seal"
            crossOrigin="anonymous"
            className="w-14 h-14 object-contain drop-shadow-md hover:scale-105 transition-transform"
          />
          <span className="text-[6px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">QC SEAL</span>
        </div>
      </div>

      {/* Bottom Signatures & Barcode */}
      <div
        className="px-3 py-1.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-[7.5px]"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div>
          <p className="font-mono font-bold text-slate-700 tracking-widest text-[8.5px]">|||| | || |||| | | ||| ||||</p>
          <div className="flex items-center gap-1.5 text-[6.5px] uppercase tracking-wider font-semibold">
            <span className="text-slate-400">Issued: {appDate}</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-800 font-bold">Expires: {expiryDateStr}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="w-18 border-b border-slate-400 mx-auto mb-0.5" />
          <p className="font-bold text-slate-800 text-[7.5px] leading-tight uppercase">MA. JOSEFINA G. BELMONTE</p>
          <p className="text-[6.5px] text-slate-500 uppercase leading-none">City Mayor</p>
        </div>
      </div>
    </div>
  )
}

function SoloParentCardBack({
  app,
  emergencyPerson,
  emergencyPhone,
  emergencyRel,
  emergencyAddr,
  cardRef,
}: {
  app: WelfareSubmission
  emergencyPerson: string
  emergencyPhone: string
  emergencyRel: string
  emergencyAddr: string
  cardRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={cardRef}
      className="w-[500px] h-[315px] rounded-2xl overflow-hidden shadow-xl border border-slate-300 relative bg-white select-none flex flex-col justify-between text-slate-900"
      style={{
        background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 50%, #fef2f2 100%)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Background Watermark Seal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0">
        <img src="/gov-serves-seal.png" alt="" crossOrigin="anonymous" className="w-48 h-48 object-contain" />
      </div>

      {/* Back Header Strip */}
      <div
        className="px-3.5 py-1.5 flex items-center justify-between text-white bg-gradient-to-r from-red-700 via-red-600 to-red-800 shadow-xs relative z-10"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <div className="flex items-center gap-1.5">
          <img src="/gov-serves-seal.png" alt="QC Seal" crossOrigin="anonymous" className="w-4 h-4 object-contain rounded-full bg-white/20 p-0.5" />
          <p className="text-[8.5px] font-black uppercase tracking-wide leading-tight">
            Republic Act 11861 — Expanded Solo Parents Welfare Act
          </p>
        </div>
        <span
          className="text-[7.5px] font-black text-amber-900 bg-amber-300 px-2 py-0.5 rounded-full border border-amber-400/80 shadow-xs"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          QC-SSDD
        </span>
      </div>

      <div className="p-3 pt-2 space-y-2 relative z-10 flex-1 flex flex-col justify-between">
        <div>
          {/* Benefits / Rights List */}
          <div
            className="bg-red-50/70 border border-red-200/80 rounded-lg p-2 space-y-1 text-[7.5px] text-slate-800 leading-tight"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          >
            <p className="flex items-start gap-1">
              <span className="text-red-600 font-bold shrink-0">✓</span>
              <span><strong>10% Discount &amp; VAT Exemption</strong> on infant formula, baby food, prescribed medicines, and essential supplies.</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="text-red-600 font-bold shrink-0">✓</span>
              <span><strong>Prioritization</strong> in local government housing, educational scholarships, and livelihood grants.</span>
            </p>
            <p className="flex items-start gap-1">
              <span className="text-red-600 font-bold shrink-0">✓</span>
              <span>Non-transferable official municipal privilege card valid nationwide across the Philippines.</span>
            </p>
          </div>

          {/* Children / Dependents List */}
          <div className="mt-1.5">
            <p className="text-[7.5px] font-black text-red-900 uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block"></span>
              Registered Children / Dependents:
            </p>
            <div
              className="grid grid-cols-2 gap-1 text-[7.5px] text-slate-700 bg-white/90 p-1.5 rounded-lg border border-red-200/60 max-h-11 overflow-y-auto"
              style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
            >
              {((app as any).familyMembers && (app as any).familyMembers.length > 0) ? (
                (app as any).familyMembers.map((m: any, i: number) => (
                  <div key={i} className="truncate flex items-center gap-1">
                    <span className="font-bold text-slate-900">• {m.name || (m as any).fullName || `${m.relationship}: child`}</span>
                    <span className="text-slate-400">({m.age || "—"} yo)</span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-slate-400 italic">1 Dependent on file</div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div
          className="border-t border-red-200/70 pt-1.5"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <p className="text-[7.5px] font-black text-slate-800 uppercase tracking-wider mb-1">In case of emergency, please notify:</p>
          <div
            className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] text-slate-700 bg-white/90 p-1.5 rounded-lg border border-red-200/60 shadow-xs"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          >
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Contact Person: </span>
              <span className="font-bold text-slate-900 truncate">{emergencyPerson}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Phone: </span>
              <span className="font-mono font-bold text-red-700">{emergencyPhone}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Relation: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyRel}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[6px]">Address: </span>
              <span className="font-semibold text-slate-800 truncate">{emergencyAddr}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OfficialSoloParentIdCardModal({
  app,
  onClose,
  allSubmissions,
}: {
  app: WelfareSubmission | null
  onClose: () => void
  allSubmissions?: WelfareSubmission[]
}) {
  if (!app) return null
  const idNumber =
    (app as any).assignedIdNumber ||
    (app as any).soloParentIdNumber ||
    generateOfficialSoloParentId(app, allSubmissions)
  const issueDateObj = new Date((app as any).dateApproved || app.submittedAt || Date.now())
  const validIssueDate = isNaN(issueDateObj.getTime()) ? new Date() : issueDateObj
  const appDate = validIssueDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const expiryDateObj = new Date(validIssueDate)
  expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1)
  const expiryDateStr = expiryDateObj.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const [activeSide, setActiveSide] = useState<"front" | "back">("front")
  const [isDownloading, setIsDownloading] = useState(false)

  const frontDownloadRef = useRef<HTMLDivElement>(null)
  const backDownloadRef = useRef<HTMLDivElement>(null)

  const handleDownloadSide = async (mode: "front" | "back") => {
    setIsDownloading(true)
    try {
      const targetElement = mode === "front" ? frontDownloadRef.current : backDownloadRef.current
      if (targetElement) {
        const dataUrl = await toPng(targetElement, {
          pixelRatio: 3,
          cacheBust: true,
          quality: 1,
          width: 500,
          height: 315,
        })
        const link = document.createElement("a")
        link.download = `QC_SOLO_PARENT_${mode.toUpperCase()}_${idNumber}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error("Failed to export PNG:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  const photoUrl = getApplicantPhotoUrl(app)

  const fdCard = (app as any).formData || (app as any).form_data || (app as any).extra_data?.formData || {}
  const edCard = (app as any).extraData || (app as any).extra_data || {}

  const emFirstCard = (app as any).emergencyFirstName || fdCard.emergencyFirstName || edCard.emergencyFirstName || (app as any).emergency_first_name || ""
  const emLastCard = (app as any).emergencyLastName || fdCard.emergencyLastName || edCard.emergencyLastName || (app as any).emergency_last_name || ""
  const emCombinedCard = [emFirstCard, emLastCard].filter(Boolean).join(" ")

  const emergencyPerson =
    emCombinedCard ||
    (app as any).emergencyContactPerson ||
    (app as any).emergency_contact_person ||
    fdCard.emergencyContactPerson ||
    edCard.emergencyContactPerson ||
    (app as any).emergencyName ||
    "—"

  const emergencyPhone =
    (app as any).emergencyContactNo ||
    (app as any).emergency_contact_no ||
    fdCard.emergencyContactNo ||
    edCard.emergencyContactNo ||
    (app as any).contactNumber ||
    "—"

  const emergencyRel =
    (app as any).emergencyRelationship ||
    (app as any).emergency_relationship ||
    fdCard.emergencyRelationship ||
    edCard.emergencyRelationship ||
    (app as any).relationshipToApplicant ||
    "—"

  const emergencyAddr =
    (app as any).emergencyAddress ||
    (app as any).emergency_address ||
    fdCard.emergencyAddress ||
    edCard.emergencyAddress ||
    getAddress(app) ||
    "Quezon City"

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-none">
                Official Quezon City Solo Parent ID Card
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                Card ID: <span className="font-mono font-bold text-blue-700">{idNumber}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl font-light leading-none p-1 cursor-pointer">×</button>
        </div>

        {/* Side Selector */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveSide("front")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeSide === "front" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            FRONT OF ID CARD
          </button>
          <button
            onClick={() => setActiveSide("back")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeSide === "back" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            BACK OF ID CARD (BENEFICIARIES &amp; PRIVILEGES)
          </button>
        </div>

        {/* Card Body Interactive Screen View */}
        <div className="p-6 bg-slate-100/80 flex flex-col items-center justify-center overflow-x-auto min-h-[380px]">
          {activeSide === "front" ? (
            <SoloParentCardFront
              app={app}
              photoUrl={photoUrl}
              idNumber={idNumber}
              appDate={appDate}
              expiryDateStr={expiryDateStr}
            />
          ) : (
            <SoloParentCardBack
              app={app}
              emergencyPerson={emergencyPerson}
              emergencyPhone={emergencyPhone}
              emergencyRel={emergencyRel}
              emergencyAddr={emergencyAddr}
            />
          )}
        </div>

        {/* ── OFF-SCREEN CAPTURE CONTAINERS (Isolated with 0 offset and exact dimensions) ── */}
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "500px",
            height: "315px",
            pointerEvents: "none",
            zIndex: -999,
          }}
          aria-hidden="true"
        >
          <SoloParentCardFront
            cardRef={frontDownloadRef}
            app={app}
            photoUrl={photoUrl}
            idNumber={idNumber}
            appDate={appDate}
            expiryDateStr={expiryDateStr}
          />
        </div>
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "500px",
            height: "315px",
            pointerEvents: "none",
            zIndex: -999,
          }}
          aria-hidden="true"
        >
          <SoloParentCardBack
            cardRef={backDownloadRef}
            app={app}
            emergencyPerson={emergencyPerson}
            emergencyPhone={emergencyPhone}
            emergencyRel={emergencyRel}
            emergencyAddr={emergencyAddr}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadSide("front")}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Front (PNG)</span>
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadSide("back")}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Back (PNG)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface DetailedViewProps {
  app: WelfareSubmission
  onClose: () => void
  onApprove: (id: string, value: string) => void
  onReject: (id: string, reason: string) => void
  onShowCard?: (app: WelfareSubmission) => void
  allSubmissions?: WelfareSubmission[]
}

function DetailedView({ app, onClose, onApprove, onReject, onShowCard, allSubmissions }: DetailedViewProps) {
  const { t } = useLanguage()
  const isSolo = isSoloParent(app)
  const idNumber = isSolo
    ? ((app as any).assignedIdNumber || (app as any).soloParentIdNumber || generateOfficialSoloParentId(app, allSubmissions))
    : ""
  const [rejectionReason, setRejectionReason] = useState(app.rejectionReason || "")
  const [actionMode, setActionMode] = useState<"view" | "approve" | "reject">("view")
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocument | null>(null)

  const address = getAddress(app)
  const subLabel = isSoloParent(app)
    ? (app as any).applicationType === "new"
      ? "New application"
      : (app as any).applicationType === "renewal"
      ? "Renewal"
      : "Lost ID replacement"
    : app.supportCategory

  let sectionNum = 0
  const nextNum = () => String(++sectionNum).padStart(2, "0")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
  className="w-full max-w-3xl my-8 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl"
  style={{
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderLeft: "1px solid var(--line)",
    boxShadow: "var(--shadow-medium)",
  }}
>
      
        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ background: "var(--surface-sunk)", borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <AvatarCircle app={app} sizeClass="h-12 w-12" />
              <div className="min-w-0">
                <h2 className="gw-serif text-xl font-semibold truncate" style={{ color: "var(--ink)" }}>{displayName(app)}</h2>
                <p className="gw-mono text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>REF {app.referenceNumber}</p>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <CategoryTag category={app.category} />
                  <span className="gw-tag gw-tag--ghost max-w-64 truncate">{subLabel}</span>
                  <StatusBadge status={app.status} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full text-xl font-light transition-colors"
              style={{ color: "var(--ink-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto space-y-7">
          {isSoloParent(app) ? (
            <>
              {/* Section 01: Personal Information */}
              <div>
                <SectionHeading number={nextNum()} icon={<User className="h-4 w-4" />}>Personal information</SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field label="Full name" value={displayName(app)} />
                  <Field
                    label="Date of birth"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                        {[app.dobMonth, app.dobDay, app.dobYear].filter(Boolean).join(" ")}
                      </span>
                    }
                  />
                  <Field label="Age / sex" value={`${app.age || "—"} / ${app.sex || "—"}`} />
                  <Field label="Civil status" value={app.civilStatus || "—"} />
                  <Field
                    label="Contact number"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                        <MaskedText
                          value={app.contactNo}
                          type="phone"
                          showButtonLabel
                          auditSubject={displayName(app)}
                          auditField="Contact Number"
                          auditModule="Solo Parent & Child Welfare"
                        />
                      </span>
                    }
                  />
                  <Field
                    label="QCID number"
                    value={
                      <MaskedText
                        value={app.qcidNumber}
                        type="id"
                        showButtonLabel
                        auditSubject={displayName(app)}
                        auditField="QCID Number"
                        auditModule="Solo Parent & Child Welfare"
                      />
                    }
                  />
                  <Field
                    label="Email address"
                    value={
                      app.email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                          <MaskedText
                            value={app.email}
                            type="email"
                            showButtonLabel
                            auditSubject={displayName(app)}
                            auditField="Email Address"
                            auditModule="Solo Parent & Child Welfare"
                          />
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field label="Barangay" value={app.addressBarangay || "—"} />
                  <div className="col-span-2">
                    <Field
                      label="Complete address"
                      value={
                        <span className="inline-flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                          {address}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 02: Application Details & Basis */}
              <div>
                <SectionHeading number={nextNum()} icon={<ClipboardList className="h-4 w-4" />}>
                  {app.applicationType === "new"
                    ? (t("spAppDetailsTitle") && t("spAppDetailsTitle") !== "spAppDetailsTitle" ? t("spAppDetailsTitle") : "Application Details & Basis")
                    : (t("spRecordVerificationTitle") && t("spRecordVerificationTitle") !== "spRecordVerificationTitle" ? t("spRecordVerificationTitle") : "Record Verification Details")}
                </SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field
                    label={t("spLabelAppType") || "Application type"}
                    value={
                      app.applicationType === "new"
                        ? (t("spAppTypeNew") || "New Solo Parent ID")
                        : app.applicationType === "renewal"
                        ? (t("spAppTypeRenewal") || "Renewal Solo Parent ID")
                        : (t("spAppTypeLoss") || "Replacement / Lost Solo Parent ID")
                    }
                  />
                  <Field
                    label={app.applicationType === "new" ? (t("spLabelIdStatus") || "Solo parent ID status") : (t("spLabelIdNumber") || "Solo parent ID / QCID number")}
                    value={
                      app.applicationType === "new"
                        ? (t("spStatusNoneNew") || "None yet (New application)")
                        : app.soloParentIdNumber || app.assignedIdNumber || app.qcidNumber || (t("spLabelExistingVerified") || "Existing record verified")
                    }
                  />
                  {app.classification && (
                    <div className="col-span-2">
                      <Field label={t("spLabelCategoryReason") || "Solo parent category / reason"} value={app.classification} />
                    </div>
                  )}
                </div>
              </div>

              {/* Only show family composition if it has actual data */}
              {app.familyMembers && app.familyMembers.length > 0 && (
                <div>
                  <SectionHeading number={nextNum()} icon={<Users className="h-4 w-4" />}>Family composition</SectionHeading>
                  <div className="space-y-2">
                    {app.familyMembers.map((m, idx) => (
                      <div key={m.id} className="p-4 rounded-lg text-sm" style={{ background: "var(--surface-sunk)" }}>
                        <p className="gw-serif font-semibold mb-2" style={{ color: "var(--ink)" }}>Member {idx + 1} — {m.name || "—"}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                          <Field label="Relationship" value={m.relationship} />
                          <Field label="Age" value={m.age} />
                          <Field label="Birthday" value={m.birthday} />
                          <Field label="Status" value={m.status} />
                          <Field label="Education" value={m.educationalAttainment} />
                          <Field label="Occupation / income" value={m.occupationMonthlyIncome} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 03: Emergency Contact */}
              {(() => {
                const rawFd = (app as any).formData || (app as any).form_data || {}
                const fd = typeof rawFd === "string" ? parseJsonSafe(rawFd, {}) : (rawFd || {})
                const fdForm = typeof fd.formData === "object" && fd.formData !== null ? fd.formData : fd
                const rawEd = (app as any).extraData || (app as any).extra_data || {}
                const ed = typeof rawEd === "string" ? parseJsonSafe(rawEd, {}) : (rawEd || {})

                const emFirst = app.emergencyFirstName || fdForm.emergencyFirstName || fd.emergencyFirstName || ed.emergencyFirstName || (app as any).emergency_first_name || ""
                const emLast = app.emergencyLastName || fdForm.emergencyLastName || fd.emergencyLastName || ed.emergencyLastName || (app as any).emergency_last_name || ""
                const emCombined = [emFirst, emLast].filter(Boolean).join(" ")

                const emPerson =
                  emCombined ||
                  fdForm.emergencyName ||
                  fdForm.emergencyContactPerson ||
                  app.emergencyName ||
                  (app as any).emergency_name ||
                  fd.emergencyName ||
                  fd.emergencyContactPerson ||
                  ed.emergencyName ||
                  (app as any).emergencyContactPerson ||
                  "—"

                const emPhone =
                  fdForm.emergencyContactNo ||
                  fdForm.emergencyPhone ||
                  app.emergencyContactNo ||
                  (app as any).emergency_contact_no ||
                  fd.emergencyContactNo ||
                  fd.emergencyPhone ||
                  (app as any).emergencyPhone ||
                  ed.emergencyContactNo ||
                  "—"

                const emRel =
                  fdForm.emergencyRelationship ||
                  app.emergencyRelationship ||
                  (app as any).emergency_relationship ||
                  fd.emergencyRelationship ||
                  ed.emergencyRelationship ||
                  (app as any).relationshipToApplicant ||
                  "—"

                const emAddr =
                  fdForm.emergencyAddress ||
                  app.emergencyAddress ||
                  (app as any).emergency_address ||
                  fd.emergencyAddress ||
                  ed.emergencyAddress ||
                  "—"

                const bType =
                  fdForm.bloodType ||
                  app.bloodType ||
                  (app as any).blood_type ||
                  fd.bloodType ||
                  ed.bloodType ||
                  "O+"

                return (
                  <div>
                    <SectionHeading number={nextNum()} icon={<Phone className="h-4 w-4" />}>
                      Emergency Contact
                    </SectionHeading>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                      <Field label="Contact Person" value={emPerson} />
                      <Field label="Relationship" value={emRel} />
                      <Field
                        label="Phone Number"
                        value={
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                            {emPhone}
                          </span>
                        }
                      />
                      <Field label="Blood Type" value={bType} />
                      <div className="col-span-2">
                        <Field
                          label="Emergency Address"
                          value={
                            <span className="inline-flex items-start gap-1.5">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                              {emAddr}
                            </span>
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Only show circumstances if it has actual data */}
              {(app.circumstanceDetails || app.needsProblems || app.familyResources) && (
                <div>
                  <SectionHeading number={nextNum()} icon={<HeartHandshake className="h-4 w-4" />}>Circumstances and needs</SectionHeading>
                  <div className="space-y-4 p-4 rounded-lg text-sm" style={{ background: "var(--surface-sunk)" }}>
                    {app.circumstanceDetails && <Field label="Situation described" value={app.circumstanceDetails} />}
                    {app.needsProblems && <Field label="Needs / problems" value={app.needsProblems} />}
                    {app.familyResources && <Field label="Family resources" value={app.familyResources} />}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Section 01: Application Details */}
              <div>
                <SectionHeading number={nextNum()} icon={<ClipboardList className="h-4 w-4" />}>Application details</SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field label="Program" value={app.supportCategory || "Child Welfare"} />
                  <Field
                    label="Type of assistance"
                    value={app.supportTypes && app.supportTypes.length > 0 ? (Array.isArray(app.supportTypes) ? app.supportTypes.join(", ") : app.supportTypes) : "—"}
                  />
                  {app.emergencyType && (
                    <Field label="Type of emergency" value={app.emergencyType} />
                  )}
                  {(app.emergencyDate || app.emergencyDateTime) && (
                    <Field
                      label="Approximate date &amp; time of incident"
                      value={
                        [app.emergencyDate, app.emergencyTime].filter(Boolean).join(" at ") ||
                        app.emergencyDateTime ||
                        "—"
                      }
                    />
                  )}
                  <Field label="Residency status" value="Residente ng Lungsod Quezon (Verified)" />
                  {app.primaryReasonForAssistance && (
                    <Field label="Reason for assistance / Concern" value={app.primaryReasonForAssistance} />
                  )}
                  {app.specificNeeds && (
                    <Field label="Description / Specific needs" value={app.specificNeeds} />
                  )}
                  {app.urgency && (
                    <Field label="Priority level / Urgency" value={app.urgency} />
                  )}
                  {app.childLivingArrangement && (
                    <Field label="Living situation / Arrangement" value={app.childLivingArrangement} />
                  )}
                </div>
              </div>

              {/* Section 02: Applicant / Child Information */}
              <div>
                <SectionHeading number={nextNum()} icon={<Baby className="h-4 w-4" />}>Applicant / Child information</SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field label="QC ID number" value={app.referenceNumber || "—"} />
                  <Field label="Full name" value={app.childName || "—"} />
                  <Field
                    label="Date of birth / age"
                    value={
                      app.childBirthday
                        ? `${app.childBirthday}${app.childAge ? ` (${app.childAge} y/o)` : ""}`
                        : app.childAge ? `${app.childAge} y/o` : "—"
                    }
                  />
                  <Field
                    label="Sex / civil status"
                    value={`${app.childSex || "—"} / ${app.guardianCivilStatus || "Single"}`}
                  />
                  <Field
                    label="Contact number"
                    value={
                      app.guardianContactNo ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                          {app.guardianContactNo}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <div className="col-span-2">
                    <Field
                      label="Complete address"
                      value={
                        <span className="inline-flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--ink-faint)" }} />
                          {address}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Section 03: Parent / Guardian / Reporting Person */}
              <div>
                <SectionHeading number={nextNum()} icon={<User className="h-4 w-4" />}>Parent / Guardian / Reporting person</SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field
                    label="Full name"
                    value={[app.guardianFirstName, app.guardianMiddleName, app.guardianLastName].filter(Boolean).join(" ") || "—"}
                  />
                  <Field label="Relationship to child" value={app.guardianRelationshipToChild || "—"} />
                  <Field
                    label="Contact number"
                    value={
                      app.guardianContactNo ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                          {app.guardianContactNo}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  {app.guardianEmail && (
                    <Field
                      label="Email"
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" style={{ color: "var(--ink-faint)" }} />
                          {app.guardianEmail}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>

              {/* Section 04: Additional Information & Protection Safety Status */}
              <div>
                <SectionHeading number={nextNum()} icon={<ShieldAlert className="h-4 w-4" />}>
                  Additional Information &amp; Protection Status
                </SectionHeading>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm p-4 rounded-lg" style={{ background: "var(--surface-sunk)" }}>
                  <Field
                    label="Reporting person is child's current parent/guardian?"
                    value={app.isReportingPersonCurrentParent || "Yes"}
                  />
                  {(app.isReportingPersonCurrentParent === "No" || app.specifiedRelationship) && (
                    <Field label="Specified relationship to child" value={app.specifiedRelationship || "—"} />
                  )}
                  <Field
                    label="Is child currently in immediate danger?"
                    value={
                      <span className={`inline-flex items-center gap-1.5 font-bold ${app.isImmediateDanger === "Yes" ? "text-red-600" : "text-emerald-700"}`}>
                        {app.isImmediateDanger || "No"}
                      </span>
                    }
                  />
                  <Field
                    label="Is child currently in a safe location?"
                    value={
                      <span className={`inline-flex items-center gap-1.5 font-bold ${app.isChildSafe === "No" ? "text-red-600" : "text-emerald-700"}`}>
                        {app.isChildSafe || "Yes"}
                      </span>
                    }
                  />
                  {app.additionalInfo && !app.additionalInfo.includes("Reporting Person") && !app.additionalInfo.includes("Immediate Danger") && (
                    <div className="col-span-2">
                      <Field label="Additional notes" value={app.additionalInfo} />
                    </div>
                  )}
                  {app.notes && (
                    <div className="col-span-2">
                      <Field label="Admin notes" value={app.notes} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Submitted Documents (shared) */}
          <div>
            <SectionHeading number={nextNum()} icon={<Paperclip className="h-4 w-4" />}>Documents on file ({app.documents?.length || 0})</SectionHeading>
            <div className="space-y-2">
              {app.documents.map((doc, idx) => {
  const m = docStatusMeta[doc.status] ?? docStatusMeta.pending
  return (
      <button
  key={idx}
  type="button"
  onClick={() => setPreviewDoc(doc)}
  className="w-full flex items-center gap-3 p-3 rounded-lg hover:opacity-80 transition-opacity text-left"
  style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
>
  <span className="gw-mono text-xs w-5 shrink-0" style={{ color: "var(--ink-faint)" }}>{String(idx + 1).padStart(2, "0")}</span>
  <span style={{ color: "var(--ink-soft)" }}>{docIcon(doc.filename)}</span>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{doc.name}</p>
    <p className="text-xs" style={{ color: "var(--ink-faint)" }}>{formatSafeDateTime(doc.uploadedAt || app.submittedAt)}</p>
  </div>
  <span className={`gw-status ${m.text} shrink-0`}>
    <span className={`gw-dot ${m.dot}`} />
    {doc.status}
  </span>
</button>
  )
})}
            </div>
          </div>

          {/* Actions */}
           <DocumentPreviewModal doc={previewDoc} app={app} onClose={() => setPreviewDoc(null)} />
          {app.status === "pending" && (
            <div className="pt-6" style={{ borderTop: "1px solid var(--line)" }}>
              {actionMode === "view" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setActionMode("approve")}
                    className="gw-btn-approve flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5"
                  >
                    <Check className="h-4 w-4" />
                    Approve application
                  </button>
                  <button
                    onClick={() => setActionMode("reject")}
                    className="gw-btn-reject flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5"
                  >
                    <X className="h-4 w-4" />
                    Reject application
                  </button>
                </div>
              )}

              {actionMode === "approve" && (
                isSolo ? (
                  <div className="space-y-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Confirm Solo Parent Approval
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          Official QC ID: {idNumber}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {String((app as any).applicationType || (app as any).type || "").toLowerCase().includes("renewal") ||
                        String((app as any).applicationType || (app as any).type || "").toLowerCase().includes("loss") ||
                        String((app as any).applicationType || (app as any).type || "").toLowerCase().includes("replacement") ? (
                          <>
                            Existing Official ID Number <strong className="font-mono text-foreground">{idNumber}</strong> has been retained from the verified record. Approving will confirm renewal/replacement without altering the ID number.
                          </>
                        ) : (
                          <>
                            Official ID Number <strong className="font-mono text-foreground">{idNumber}</strong> has been assigned. Approving will automatically connect this application to <strong>Appointments</strong> for claiming/pickup schedule.
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActionMode("view")}
                        className="gw-btn-ghost flex-1 h-10 text-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApprove(app.id, idNumber)
                          onClose()
                        }}
                        className="gw-btn-approve flex-1 h-10 text-sm cursor-pointer"
                      >
                        Confirm Approval &amp; Connect to Appointment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Confirm {(app as any).supportCategory || "Child Welfare Support"} Approval
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-md font-mono">
                          Fixed Grant: ₱5,000
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Approving will automatically record this grant (<strong>₱5,000 Fixed Financial Aid</strong>) for <strong>{(app as any).supportCategory || "Child Welfare Assistance"}</strong> to <strong>Financial Aid Disbursement</strong> and connect to <strong>Appointments</strong> for payout scheduling.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setActionMode("view")}
                        className="gw-btn-ghost flex-1 h-10 text-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onApprove(app.id, "5000")
                          onClose()
                        }}
                        className="gw-btn-approve flex-1 h-10 text-sm cursor-pointer font-semibold"
                      >
                        Confirm Approval &amp; Forward (₱5,000)
                      </button>
                    </div>
                  </div>
                )
              )}

              {actionMode === "reject" && (
                <div className="space-y-4 rounded-lg p-4" style={{ background: "var(--redwood-soft)", border: "1px solid var(--redwood-line)" }}>
                  <div>
                    <label className="text-sm font-semibold" style={{ color: "var(--redwood-ink)" }}>Reason for rejection</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="gw-input w-full mt-2 px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setActionMode("view")} className="gw-btn-ghost flex-1 px-4 py-2">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (rejectionReason.trim()) {
                          onReject(app.id, rejectionReason)
                          onClose()
                        }
                      }}
                      className="gw-btn-reject flex-1 px-4 py-2"
                    >
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {app.status === "approved" && (
            <div className="rounded-lg p-4" style={{ background: "var(--forest-soft)", border: "1px solid var(--forest-line)" }}>
              <p className="text-sm" style={{ color: "var(--forest-ink)" }}>
                <strong>Approved</strong> on {formatSafeDate(app.approvedDate || (app as any).updated_at || app.submittedAt)} by {app.approvedBy || "Social Worker Staff"}
              </p>
              {isSoloParent(app) && app.assignedIdNumber && (
                <p className="text-sm mt-2 gw-mono" style={{ color: "var(--forest-ink)" }}>
                  <strong className="gw-mono">ID number:</strong> {app.assignedIdNumber}
                </p>
              )}
              {!isSoloParent(app) && app.approvedAmount && (
                <p className="text-sm mt-2" style={{ color: "var(--forest-ink)" }}>
                  <strong>Approved amount:</strong> ₱{app.approvedAmount}
                </p>
              )}
              {app.notes && (
                <p className="text-sm mt-2" style={{ color: "var(--forest-ink)" }}>
                  <strong>Notes:</strong> {app.notes}
                </p>
              )}
            </div>
          )}

          {app.status === "rejected" && (
            <div className="rounded-lg p-4" style={{ background: "var(--redwood-soft)", border: "1px solid var(--redwood-line)" }}>
              <p className="text-sm" style={{ color: "var(--redwood-ink)" }}>
                <strong>Rejected:</strong> {app.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0" style={{ borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
          <div>
            {onShowCard && app.status === "approved" && isSolo && (
              <button
                type="button"
                onClick={() => onShowCard(app)}
                className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <IdCard className="h-4 w-4 text-blue-600" />
                View ID Card
              </button>
            )}
          </div>
          <button onClick={onClose} className="gw-btn-ghost px-6 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================================
// Main Admin Component
// =====================================================================================

export default function SoloParentChildWelfareAdmin() {
  const [applications, setApplications] = useState<WelfareSubmission[]>(() => {
    try {
      const localSolo = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
      const localChild = JSON.parse(localStorage.getItem("child_welfare_applications") || "[]")
      const solo = (Array.isArray(localSolo) ? localSolo : []).map(mapSoloParentRow)
      const child = (Array.isArray(localChild) ? localChild : []).map(mapChildWelfareRow)
      return [...solo, ...child].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    } catch {
      return []
    }
  })
  const isFetchingRef = useRef(false)

  const loadApplications = async (_silent?: boolean) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const apps = await fetchAllSubmissions()
      setApplications(apps)
    } catch (err) {
      console.error("Failed to load applications:", err)
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    loadApplications()

    const interval = setInterval(() => {
      loadApplications()
    }, 8000)

    const unsubscribe = subscribeToRealtimeChanges(() => {
      loadApplications()
    })

    const handleSync = () => loadApplications()
    window.addEventListener("focus", handleSync)

    return () => {
      clearInterval(interval)
      unsubscribe()
      window.removeEventListener("focus", handleSync)
    }
  }, [])


  const [selectedApp, setSelectedApp] = useState<WelfareSubmission | null>(null)
  const [cardApp, setCardApp] = useState<WelfareSubmission | null>(null)
  const [filterCategory, setFilterCategory] = useState<"all" | "Solo Parent" | "Child Welfare">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "needs_revision">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const handleApprove = async (id: string, value: string) => {
    const app = applications.find((a) => a.id === id || a.referenceNumber === id)
    if (!app) return

    const approvedDate = new Date().toISOString()
    const targetRef = app.referenceNumber || ""

    // 1. Instant Optimistic UI + Storage
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id === app.id || (targetRef && a.referenceNumber === targetRef)) {
          return {
            ...a,
            status: "approved",
            assignedIdNumber: value,
            soloParentIdNumber: value,
            approvedAmount: isSoloParent(app) ? undefined : value,
            approvedBy: "Social Worker Staff",
            approvedDate,
          }
        }
        return a
      })
    )

    try {
      if (isSoloParent(app)) {
        const localSolo = JSON.parse(localStorage.getItem("solo_parent_applications") || "[]")
        const nextSolo = localSolo.map((a: any) =>
          a.id === app.id || (targetRef && a.referenceNumber === targetRef)
            ? { ...a, status: "approved", assigned_id_number: value, solo_parent_id_number: value, approved_by: "Social Worker Staff", updated_at: approvedDate, approved_date: approvedDate, approvedDate, submittedAt: a.submittedAt || a.created_at || approvedDate }
            : a
        )
        localStorage.setItem("solo_parent_applications", JSON.stringify(nextSolo))
      } else {
        const localChild = JSON.parse(localStorage.getItem("child_welfare_applications") || "[]")
        const nextChild = localChild.map((a: any) =>
          a.id === app.id || (targetRef && a.referenceNumber === targetRef)
            ? { ...a, status: "approved", approved_amount: value, approved_by: "Social Worker Staff", updated_at: approvedDate, approved_date: approvedDate, approvedDate, submittedAt: a.submittedAt || a.created_at || approvedDate }
            : a
        )
        localStorage.setItem("child_welfare_applications", JSON.stringify(nextChild))
      }
    } catch {}

    try {
      // 2. Persist to PostgreSQL Database
      await approveSubmission(app, value)

      if (isSoloParent(app)) {
        if (app.email) {
          try {
            fetch(`${API_BASE}/api/email/send-solo-parent-id`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                recipientEmail: app.email,
                recipientName: displayName(app),
                soloParentIdNumber: value,
                referenceNumber: app.referenceNumber,
                classification: app.classification,
                applicationType: app.applicationType,
                approvedDate,
                contactNumber: app.contactNo,
                address: [app.addressHouseNo, app.addressStreet, app.addressBarangay, app.addressCityMunicipality].filter(Boolean).join(", "),
              }),
            }).catch((e) => console.warn("[Solo Parent Email Error]:", e))
          } catch (mailErr) {
            console.warn("[Solo Parent Email Dispatch Failed]:", mailErr)
          }
        }

        // Sync Solo Parent ID claiming to Appointments
        try {
          fetch(`${API_BASE}/api/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referenceNo: app.referenceNumber,
              reference_no: app.referenceNumber,
              module: "Solo Parent",
              applicantName: displayName(app),
              applicant_name: displayName(app),
              concern: "Solo Parent ID Card Claiming",
              status: "pending",
            }),
          }).catch(() => {})
        } catch {}

        pushUserNotification({
          title: "Solo Parent ID: Approved",
          desc: `Congratulations! Your Solo Parent ID application (ID No. ${value}) has been approved and forwarded to Appointments for claiming schedule.`,
          applicationRef: app.referenceNumber,
          assistanceType: "Solo Parent ID",
        })
      } else {
        // Child Welfare Support Grant
        const grantAmount = Number(value) || 5000
        const supportTitle = app.supportCategory ? `${app.supportCategory} (Child Welfare)` : "Child Welfare Support"

        // 1. Sync to Financial Aid Disbursements
        try {
          const currentDisbursements = getSavedDisbursements()
          if (!currentDisbursements.some((d) => d.applicationRef === app.referenceNumber)) {
            const newRecord: SyncedDisbursementRecord = {
              id: `disb-cw-${app.referenceNumber || Date.now()}`,
              disbursementId: `DISB-2026-${String(currentDisbursements.length + 1).padStart(4, "0")}`,
              applicationRef: app.referenceNumber,
              applicantName: displayName(app).toUpperCase(),
              assistanceType: supportTitle,
              fixedAmount: grantAmount,
              dateApproved: new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }),
              status: "PENDING",
              venue: "Quezon City Hall - Social Services Development Department",
              remarks: "Awtomatikong pumasok mula sa Child Welfare Assistance aplikasyon.",
            }
            saveDisbursements([newRecord, ...currentDisbursements])
          }
        } catch (err) {
          console.warn("Failed saving child welfare disbursement record:", err)
        }

        // 2. Sync to Appointments for payout scheduling
        try {
          fetch(`${API_BASE}/api/appointments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referenceNo: app.referenceNumber,
              reference_no: app.referenceNumber,
              module: "Child Welfare",
              applicantName: displayName(app),
              applicant_name: displayName(app),
              concern: supportTitle,
              status: "pending",
            }),
          }).catch(() => {})
        } catch {}

        // 3. In-portal Bell Notification
        pushUserNotification({
          title: "Child Welfare: Approved",
          desc: `Congratulations! Your application for ${supportTitle} has been approved and forwarded to Appointments for payout scheduling and Financial Aid Disbursement (₱${grantAmount.toLocaleString()}).`,
          applicationRef: app.referenceNumber,
          assistanceType: supportTitle,
          amount: grantAmount,
        })
      }

      window.dispatchEvent(new Event("appointments_updated"))
      window.dispatchEvent(new Event("financial_disbursements_updated"))
      window.dispatchEvent(new Event("storage"))

      notifyApplicationChange("APPLICATION_APPROVED", isSoloParent(app) ? "solo_parent" : "child_welfare", app.referenceNumber)
      await loadApplications(true)
    } catch (err) {
      console.error("Approval error:", err)
      await loadApplications(true)
    }
  }

  const handleReject = async (id: string, reason: string) => {
    const app = applications.find((a) => a.id === id || a.referenceNumber === id)
    if (!app) return

    const targetRef = app.referenceNumber || ""

    // 1. Instant Optimistic UI Update + Storage
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id === app.id || (targetRef && a.referenceNumber === targetRef)) {
          return {
            ...a,
            status: "rejected",
            rejectionReason: reason,
          }
        }
        return a
      })
    )

    try {
      await rejectSubmission(app, reason)
      window.dispatchEvent(new Event("storage"))
      notifyApplicationChange("APPLICATION_REJECTED", isSoloParent(app) ? "solo_parent" : "child_welfare", app.referenceNumber)
      await loadApplications(true)
    } catch (err) {
      console.error("Reject error:", err)
      await loadApplications(true)
    }
  }


  const filteredApps = applications.filter((app) => {
    const matchCategory = filterCategory === "all" || app.category === filterCategory
    const matchStatus = filterStatus === "all" || app.status === filterStatus
    const name = displayName(app).toLowerCase()
    const matchSearch =
      searchTerm === "" ||
      name.includes(searchTerm.toLowerCase()) ||
      app.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCategory && matchStatus && matchSearch
  })

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  }

  const categoryOptions: Array<{ value: typeof filterCategory; label: string }> = [
    { value: "all", label: "All categories" },
    { value: "Solo Parent", label: "Solo Parent" },
    { value: "Child Welfare", label: "Child Welfare" },
  ]
  const statusOptions: Array<{ value: typeof filterStatus; label: string }> = [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ]

  return (
    <div className="gw-root">
      <Tokens />
      <div className="p-4 md:p-8 space-y-7 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="gw-serif text-[2.1rem] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
            Solo Parent &amp; Child Welfare
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total applications", value: stats.total, color: "var(--ink)" },
            { label: "Pending review", value: stats.pending, color: "var(--gold)" },
            { label: "Approved", value: stats.approved, color: "var(--forest)" },
            { label: "Rejected", value: stats.rejected, color: "var(--redwood)" },
          ].map((stat) => (
            <div key={stat.label} className="gw-stat p-4">
              <p className="gw-eyebrow" style={{ color: "var(--ink-faint)" }}>{stat.label}</p>
              <p className="gw-serif text-3xl font-semibold mt-2" style={{ color: "var(--ink)" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="gw-card p-4 space-y-4">
          <div className="flex items-center gap-2 rounded-lg px-3" style={{ border: "1px solid var(--line)", background: "var(--surface-sunk)" }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--ink-faint)" }} />
            <input
              type="text"
              placeholder="Search by name or reference number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none"
              style={{ color: "var(--ink)" }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="gw-eyebrow mb-2" style={{ color: "var(--ink-faint)" }}>Category</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterCategory(opt.value)}
                    className={`gw-tag gw-tag--btn ${
                      opt.value === "all" ? "gw-tag--ghost" : opt.value === "Solo Parent" ? "gw-tag--solo" : "gw-tag--child"
                    } ${filterCategory === opt.value ? "is-active" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="gw-eyebrow mb-2" style={{ color: "var(--ink-faint)" }}>Status</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className="gw-tag gw-tag--ghost gw-tag--btn"
                    style={filterStatus === opt.value ? { opacity: 1, borderColor: "var(--ink-soft)" } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="gw-serif text-lg font-semibold" style={{ color: "var(--ink)" }}>Applications</h2>
              <span className="gw-mono text-sm" style={{ color: "var(--ink-faint)" }}>({filteredApps.length})</span>
            </div>
          </div>

          {filteredApps.length === 0 ? (
            <div className="text-center py-16 gw-card">
              <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--ink-faint)" }} />
              <p className="gw-serif text-base font-semibold" style={{ color: "var(--ink)" }}>No applications found</p>
              <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>Try a different search term or filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={() => setSelectedApp(app)}
                  onShowCard={(app) => setCardApp(app)}
                  allSubmissions={applications}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedApp && (
        <DetailedView
          app={selectedApp}
          allSubmissions={applications}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onShowCard={(app) => setCardApp(app)}
        />
      )}

      {cardApp && (
        <OfficialSoloParentIdCardModal
          app={cardApp}
          onClose={() => setCardApp(null)}
          allSubmissions={applications}
        />
      )}
    </div>
  )
}
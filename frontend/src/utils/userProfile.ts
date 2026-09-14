// Centralized Dynamic User Profile & Unique QCID Manager

export interface LoggedInUserProfile {
  id?: string | number
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  birthMonth?: string
  birthDay?: string
  birthYear?: string
  dobMonth?: string
  dobDay?: string
  dobYear?: string
  birthDate?: string
  birthDateIso?: string
  birthDateDisplay?: string
  age?: string | number
  city?: string
  barangay?: string
  street?: string
  houseNo?: string
  addressHouseNo?: string
  addressStreet?: string
  addressBarangay?: string
  addressCityMunicipality?: string
  addressCity?: string
  workingInQC?: string
  occupation?: string
  sex?: string
  gender?: string
  civilStatus?: string
  mobileNumber?: string
  contactNo?: string
  email?: string
  qcidNo: string
  qcidNumber: string
  role?: string
  profilePhotoUrl?: string | null
  nationality?: string
  emergencyFirstName?: string
  emergencyLastName?: string
  emergencyContactNo?: string
  emergencyRelationship?: string
  emergencyAddress?: string
}

export function getCurrentUser(): any {
  try {
    const raw =
      sessionStorage.getItem("currentUser") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user_profile")
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Clamps year, month, and day to a real, valid date in the Gregorian calendar.
 */
export function clampValidDate(year: number, month: number, day: number): string {
  const currYear = new Date().getFullYear()
  let y = Math.floor(year)
  if (isNaN(y)) y = 2000
  if (y < 100) {
    y = y <= (currYear % 100) ? 2000 + y : 1900 + y
  } else if (y < 1900 || y > currYear) {
    y = 2000
  }

  let m = Math.floor(month)
  if (isNaN(m) || m < 1) m = 1
  if (m > 12) m = 12

  // Exact maximum days in this month of this year
  const maxDays = new Date(y, m, 0).getDate()
  let d = Math.floor(day)
  if (isNaN(d) || d < 1) d = 1
  if (d > maxDays) d = maxDays

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/**
 * Normalizes any date string into YYYY-MM-DD.
 */
export function toISODateString(val?: string | null): string {
  if (!val) return ""
  const str = String(val).trim()
  if (!str) return ""

  // 1. Matches YYYY-MM-DD or YYYY-M-D
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    return clampValidDate(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[3], 10)
    )
  }

  const MONTHS: Record<string, number> = {
    JANUARY: 1, JAN: 1, ENERO: 1,
    FEBRUARY: 2, FEB: 2, PEBRERO: 2,
    MARCH: 3, MAR: 3, MARSO: 3,
    APRIL: 4, APR: 4, ABRIL: 4,
    MAY: 5, MAYO: 5,
    JUNE: 6, JUN: 6, HUNYO: 6,
    JULY: 7, JUL: 7, HULYO: 7,
    AUGUST: 8, AUG: 8, AGOSTO: 8,
    SEPTEMBER: 9, SEP: 9, SEPT: 9, SETYEMBRE: 9,
    OCTOBER: 10, OCT: 10, OKTUBRE: 10,
    NOVEMBER: 11, NOV: 11, NOBYEMBRE: 11,
    DECEMBER: 12, DEC: 12, DISYEMBRE: 12,
  }

  // 2. Match "Month DD, YYYY" or "Month DD YY" or "Month DD, 12"
  const m1 = str.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{1,4})$/)
  if (m1) {
    const monthNum = MONTHS[m1[1].toUpperCase()] || 1
    const day = parseInt(m1[2], 10)
    const year = parseInt(m1[3], 10)
    return clampValidDate(year, monthNum, day)
  }

  // 3. Match "MM/DD/YYYY" or "M/D/YY"
  const m2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/)
  if (m2) {
    const monthNum = parseInt(m2[1], 10)
    const day = parseInt(m2[2], 10)
    const year = parseInt(m2[3], 10)
    return clampValidDate(year, monthNum, day)
  }

  // 4. Try JS Date parser
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return clampValidDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }

  return ""
}

/**
 * Generates a random unique 15-digit QCID starting with 110000
 */
export function generateUniqueQcid(): string {
  const random9 = Math.floor(100000000 + Math.random() * 900000000).toString()
  return `110000${random9}`
}

/**
 * Returns the currently authenticated user's profile.
 */
export function getCurrentUserProfile(): LoggedInUserProfile {
  const currentUser = getCurrentUser()
  const u = currentUser || {}

  let qcid = u?.qcidNumber || u?.qcid_number || u?.qcidNo || u?.qcid
  if (!qcid) {
    qcid = generateUniqueQcid()
    if (currentUser) {
      currentUser.qcidNumber = qcid
      currentUser.qcidNo = qcid
      try {
        sessionStorage.setItem("currentUser", JSON.stringify(currentUser))
        localStorage.setItem("currentUser", JSON.stringify(currentUser))
      } catch {}
    }
  }

  const rawBirthDate = u?.birthDate || u?.birth_date || u?.birthdate || ""
  let parsedMonth = (u?.birthMonth || u?.birth_month || "").toUpperCase()
  let parsedDay = String(u?.birthDay || u?.birth_day || "")
  let parsedYear = String(u?.birthYear || u?.birth_year || "")

  const MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ]

  if (rawBirthDate && (!parsedMonth || !parsedYear || !parsedDay)) {
    const trimmed = String(rawBirthDate).trim()
    // YYYY-MM-DD
    const isoM = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoM) {
      const y = parseInt(isoM[1], 10)
      const m = parseInt(isoM[2], 10)
      const d = parseInt(isoM[3], 10)
      parsedYear = String(y)
      parsedDay = String(d)
      parsedMonth = MONTH_NAMES[m - 1] || "JANUARY"
    } else {
      // MM/DD/YYYY
      const slashM = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (slashM) {
        const m = parseInt(slashM[1], 10)
        const d = parseInt(slashM[2], 10)
        const y = parseInt(slashM[3], 10)
        parsedYear = String(y)
        parsedDay = String(d)
        parsedMonth = MONTH_NAMES[m - 1] || "JANUARY"
      } else {
        // "Month DD, YYYY" or "JUNE 9 2005"
        const parts = trimmed.split(/[\s,]+/)
        if (parts.length >= 3) {
          parsedMonth = parts[0].toUpperCase()
          parsedDay = parts[1].replace(/\D/g, "")
          parsedYear = parts[2].replace(/\D/g, "")
        }
      }
    }
  }

  const currYear = new Date().getFullYear()
  let numYear = parseInt(parsedYear, 10)
  if (isNaN(numYear) || numYear < 1900 || numYear > currYear) {
    numYear = 2000
  }
  const birthYear = String(numYear)
  const calculatedAge = String(Math.max(1, currYear - numYear))

  const monthIdx = MONTH_NAMES.indexOf(parsedMonth) >= 0 ? MONTH_NAMES.indexOf(parsedMonth) + 1 : (parseInt(parsedMonth, 10) || 1)
  const numericMonth = String(monthIdx).padStart(2, "0")
  const numericDay = String(parsedDay || "1").padStart(2, "0")

  const finalBirthDate = rawBirthDate || `${birthYear}-${numericMonth}-${numericDay}`
  const isoBirthDate = toISODateString(finalBirthDate) || `${birthYear}-${numericMonth}-${numericDay}`
  const displayBirthDate = parsedMonth && parsedDay ? `${parsedMonth} ${parsedDay}, ${birthYear}` : `${birthYear}-${numericMonth}-${numericDay}`

  const rawSex = String(u?.sex || u?.gender || "FEMALE").toUpperCase()
  const formattedSex = rawSex.includes("MALE") && !rawSex.includes("FEMALE") ? "Male" : "Female"

  const fName = (u?.firstName || u?.first_name || "").trim()
  const mName = (u?.middleName || u?.middle_name || "").trim()
  const lName = (u?.lastName || u?.last_name || "").trim()
  const sfx = (u?.suffix || "").trim()

  const house = u?.houseNo || u?.house_no || u?.addressHouseNo || ""
  const street = u?.street || u?.addressStreet || ""
  const brgy = u?.barangay || u?.addressBarangay || ""
  const city = u?.city || u?.addressCity || u?.addressCityMunicipality || "QUEZON CITY"
  const fullAddress = [house, street, brgy, city].filter(Boolean).join(", ")

  return {
    id: u?.id || u?.userId || u?._id || "",
    firstName: fName,
    middleName: mName,
    lastName: lName,
    suffix: sfx,
    birthMonth: parsedMonth || "JANUARY",
    birthDay: parsedDay || "1",
    birthYear: birthYear,
    dobMonth: numericMonth,
    dobDay: numericDay,
    dobYear: birthYear,
    birthDate: isoBirthDate,
    birthDateIso: isoBirthDate,
    birthDateDisplay: displayBirthDate,
    age: u?.age || calculatedAge,
    city: city.toUpperCase(),
    barangay: brgy.toUpperCase(),
    street: street.toUpperCase(),
    houseNo: house,
    addressHouseNo: house,
    addressStreet: street,
    addressBarangay: brgy,
    addressCityMunicipality: city,
    workingInQC: u?.workingInQC || u?.working_in_qc || "No",
    occupation: (u?.occupation || "").toUpperCase(),
    sex: formattedSex,
    gender: formattedSex,
    civilStatus: u?.civilStatus || "Single",
    mobileNumber: u?.mobileNumber || u?.mobile_number || u?.contactNo || "",
    contactNo: u?.mobileNumber || u?.mobile_number || u?.contactNo || "",
    email: u?.email || "",
    qcidNo: qcid,
    qcidNumber: qcid,
    role: u?.role || "user",
    profilePhotoUrl: u?.profilePhotoUrl || u?.profile_photo_url || null,
    nationality: u?.nationality || "FILIPINO",
    emergencyFirstName: u?.emergencyFirstName || u?.emergency_first_name || "",
    emergencyLastName: u?.emergencyLastName || u?.emergency_last_name || "",
    emergencyContactNo: u?.emergencyContactNo || u?.emergency_contact_no || u?.emergency_phone || "",
    emergencyRelationship: u?.emergencyRelationship || u?.emergency_relationship || "",
    emergencyAddress: u?.emergencyAddress || u?.emergency_address || fullAddress,
  }
}

export function getLoggedInUserQcid(): string {
  return getCurrentUserProfile().qcidNo
}

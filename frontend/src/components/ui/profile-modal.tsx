import { useState, useEffect, useRef, useCallback } from "react"
import {
  X,
  User,
  AlertTriangle,
  IdCard,
  Eye,
  EyeOff,
  Languages,
  Check,
  Camera,
  Trash2,
  KeyRound,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  RefreshCw,
  LogOut,
  Clock,
  CheckCircle2,
  Shield,
  Building,
  ShieldCheck,
  Layers,
} from "lucide-react"

import { useLanguage, type Language } from "./language-context"
import { getSavedProfilePhoto, saveProfilePhoto, removeProfilePhoto } from "../../utils/profilePhoto"
import { API_BASE } from "../../config/api"

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  name?: string
  email?: string
  role?: string
  qcidNo?: string
  user?: any
}

interface DeviceSession {
  id: number | string;
  email: string;
  sessionToken: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isActive: boolean;
  isCurrentDevice: boolean;
  loginAt: string;
  lastActiveAt?: string;
  logoutAt?: string;
  logoutReason?: string;
}

interface FormData {
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  birthMonth: string
  birthDay: string
  birthYear: string
  bloodType: string
  city: string
  houseNo: string
  street: string
  barangay: string
  workingInCity: boolean
  occupation: string
  sex: string
  mobileNumber: string
}

import { getCurrentUserProfile, getCurrentUser } from "../../utils/userProfile"

function formatSessionDate(isoString?: string) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function ProfileModal({
  open,
  onClose,
  name = "Resident",
  email,
  role,
  qcidNo,
  user,
}: ProfileModalProps) {

  // Load current registered user from props or storage
  const getStoredUser = () => {
    if (user) return user;
    try {
      const u = getCurrentUserProfile() || getCurrentUser();
      return u;
    } catch {
      return null;
    }
  };

  const currentUser = getStoredUser();
  const resolvedEmail = email || currentUser?.email || "";
  const resolvedQcid = qcidNo || currentUser?.qcidNumber || currentUser?.qcid_number || currentUser?.qcidNo || "110000116932100";

  const buildInitialData = (uParam?: any): FormData => {
    const u = uParam || currentUser || getCurrentUserProfile();
    return {
      firstName: (u?.firstName || u?.first_name || "").toUpperCase(),
      middleName: (u?.middleName || u?.middle_name || "").toUpperCase(),
      lastName: (u?.lastName || u?.last_name || "").toUpperCase(),
      suffix: (u?.suffix || "").toUpperCase(),
      birthMonth: (u?.birthMonth || u?.birth_month || (u?.birthDate ? u.birthDate.split(" ")[0] : "") || "JANUARY").toUpperCase(),
      birthDay: String(u?.birthDay || u?.birth_day || (u?.birthDate ? u.birthDate.split(" ")[1]?.replace(",", "") : "1") || "1"),
      birthYear: String(u?.birthYear || u?.birth_year || (u?.birthDate ? u.birthDate.split(",")[1]?.trim() : "2000") || "2000"),
      bloodType: (u?.bloodType || u?.blood_type || "O+").toUpperCase(),
      city: (u?.city || u?.addressCity || "QUEZON CITY").toUpperCase(),
      houseNo: u?.houseNo || u?.house_no || u?.addressHouseNo || "",
      street: (u?.street || u?.addressStreet || "").toUpperCase(),
      barangay: (u?.barangay || u?.addressBarangay || "").toUpperCase(),
      workingInCity: u?.workingInQC === "Yes" || u?.working_in_qc === "Yes" || u?.workingInCity === true || false,
      occupation: (u?.occupation || "").toUpperCase(),
      sex: (u?.sex || u?.gender || "FEMALE").toUpperCase(),
      mobileNumber: u?.mobileNumber || u?.mobile_number || u?.contactNo || "",
    };
  };

  const [photoUrl, setPhotoUrl] = useState<string | null>(() => getSavedProfilePhoto(resolvedQcid));
  const [tab, setTabState] = useState<"account" | "personal" | "devices" | "preferences">(() => {
    const saved = localStorage.getItem("profile_modal_tab") || sessionStorage.getItem("profile_modal_tab");
    if (saved === "personal" || saved === "devices" || saved === "preferences" || saved === "account") {
      return saved;
    }
    return "account";
  });

  const setTab = (newTab: "account" | "personal" | "devices" | "preferences") => {
    localStorage.setItem("profile_modal_tab", newTab);
    sessionStorage.setItem("profile_modal_tab", newTab);
    setTabState(newTab);
  };
  const [showQcid, setShowQcid] = useState(false);
  const [formData, setFormData] = useState<FormData>(buildInitialData);
  const [savedFormData, setSavedFormData] = useState<FormData>(buildInitialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Device management state
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceActionMsg, setDeviceActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);

  const fetchDeviceSessions = useCallback(async (isSilent = false) => {
    if (!resolvedEmail) return;
    if (!isSilent) {
      setIsLoadingDevices(true);
    }
    setDeviceActionMsg(null);
    try {
      let currentToken = sessionStorage.getItem("sessionToken") || localStorage.getItem("sessionToken");
      if (!currentToken) {
        currentToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        sessionStorage.setItem("sessionToken", currentToken);
        localStorage.setItem("sessionToken", currentToken);
      }
      const res = await fetch(
        `${API_BASE}/api/auth/devices?email=${encodeURIComponent(resolvedEmail)}&token=${encodeURIComponent(currentToken)}`
      );
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.sessions)) {
        setDeviceSessions(data.sessions);
      }
    } catch (err) {
      console.error("Error fetching device sessions:", err);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [resolvedEmail]);

  useEffect(() => {
    if (open && tab === "devices") {
      fetchDeviceSessions(false);
      const interval = setInterval(() => {
        fetchDeviceSessions(true);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [open, tab, fetchDeviceSessions]);

  const handleLogoutAllOtherDevices = async () => {
    if (!resolvedEmail) return;
    setIsLoggingOutOthers(true);
    setDeviceActionMsg(null);
    try {
      const currentToken = sessionStorage.getItem("sessionToken") || "";
      const res = await fetch(`${API_BASE}/api/auth/devices/logout-others`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resolvedEmail, currentToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeviceSessions((prev) => prev.filter((s) => s.isCurrentDevice));
        setDeviceActionMsg({
          type: "success",
          text: language === "tl" ? "Na-logout at naalis na ang lahat ng ibang device." : "All other device sessions have been logged out and removed.",
        });
        fetchDeviceSessions();
      } else {
        setDeviceActionMsg({
          type: "error",
          text: data.message || "Failed to log out other devices.",
        });
      }
    } catch (err) {
      setDeviceActionMsg({
        type: "error",
        text: "Network error logging out other devices.",
      });
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  const handleRemoveDevice = async (sessionId: number | string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/devices/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeviceSessions((prev) => prev.filter((s) => String(s.id) !== String(sessionId)));
        setDeviceActionMsg({
          type: "success",
          text: language === "tl" ? "Naalis na ang device sa talaan." : "Device removed from history.",
        });
      } else {
        setDeviceActionMsg({
          type: "error",
          text: data.message || "Failed to remove device.",
        });
      }
    } catch {
      setDeviceActionMsg({
        type: "error",
        text: "Network error removing device.",
      });
    }
  };

  // Track open state so we ONLY reset on fresh modal open, preventing auto-erasing while typing
  const prevOpenRef = useRef(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live password requirements & strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isAllValid = hasMinLength && hasNumber && hasSpecialChar && hasUpper && passwordsMatch;

  const passedCriteriaCount = [hasMinLength, hasNumber, hasSpecialChar, hasUpper].filter(Boolean).length;

  const getStrengthInfo = () => {
    if (!newPassword) return { label: "", score: 0, color: "bg-gray-200", textColor: "text-gray-400" };
    if (passedCriteriaCount <= 1) return { label: t("strengthWeak"), score: 1, color: "bg-red-500", textColor: "text-red-600" };
    if (passedCriteriaCount === 2) return { label: t("strengthFair"), score: 2, color: "bg-amber-500", textColor: "text-amber-600" };
    if (passedCriteriaCount === 3) return { label: t("strengthGood"), score: 3, color: "bg-blue-500", textColor: "text-blue-600" };
    return { label: t("strengthStrong"), score: 4, color: "bg-emerald-500", textColor: "text-emerald-600" };
  };

  const strength = getStrengthInfo();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword) {
      setPasswordMsg({ type: "error", text: t("pleaseEnterNewPassword") });
      return;
    }

    if (!isAllValid) {
      setPasswordMsg({ type: "error", text: t("pleaseFollowRequirements") });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resolvedEmail,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg({ type: "success", text: data.message || t("passwordChangeSuccess") });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.message || t("passwordChangeFailed") });
      }
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: t("connectionError") });
    } finally {
      setIsChangingPassword(false);
    }
  };


  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const liveProf = getCurrentUserProfile();
      const initial = buildInitialData(user || liveProf);
      setFormData(initial);
      setSavedFormData(initial);
      setPhotoUrl(getSavedProfilePhoto(resolvedQcid));
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg(null);

      const targetEmail = resolvedEmail || liveProf?.email;
      if (targetEmail && targetEmail !== "resident@gmail.com") {
        fetch(`${API_BASE}/api/users/profile?email=${encodeURIComponent(targetEmail)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.user) {
              const dbData = buildInitialData(data.user);
              setFormData(dbData);
              setSavedFormData(dbData);
              try {
                localStorage.setItem("currentUser", JSON.stringify(data.user));
                sessionStorage.setItem("currentUser", JSON.stringify(data.user));
              } catch { }
            }
          })
          .catch(() => { });
      }
    }
    prevOpenRef.current = open;
  }, [open, user, resolvedEmail]);



  const languageOptions: { value: Language; label: string }[] = [
    { value: "en", label: t("english") },
    { value: "tl", label: t("tagalog") },
    { value: "bis", label: t("bisaya") },
  ];

  if (!open) return null;

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Pumili lang ng image file (JPG, PNG, atbp).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Masyadong malaki ang file. 2MB pababa lang ang pwede.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoUrl(dataUrl);
      try {
        saveProfilePhoto(dataUrl, resolvedQcid);
      } catch (err) {
        console.error("Hindi na-save ang photo:", err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!photoUrl) return;
    if (
      window.confirm(
        "Gusto mo bang alisin ang iyong profile photo? / Do you want to remove your profile photo?"
      )
    ) {
      setPhotoUrl(null);
      removeProfilePhoto(resolvedQcid);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(savedFormData);
    setIsEditing(false);
  };

  const fieldClass = (extra = "") =>
    `w-full border rounded-lg px-3 py-2.5 text-sm transition-colors ${isEditing
      ? `border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${extra}`
      : "border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 cursor-not-allowed"
    }`;

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      t("dangerZoneDesc") + "\n\n" + (language === "tl" ? "Sigurado ka bang nais mong i-deactivate ang iyong account?" : "Are you sure you want to deactivate your account?")
    );
    if (!confirmed) return;

    try {
      const target = resolvedEmail || currentUser?.email;
      if (target) {
        await fetch(`${API_BASE}/api/users/${encodeURIComponent(target)}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        });
      }
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      sessionStorage.clear();
      alert(language === "tl" ? "Na-deactivate na ang iyong account." : "Your account has been deactivated.");
      window.location.href = "/login";
    } catch (err) {
      console.error("Deactivation error:", err);
      localStorage.removeItem("currentUser");
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      language === "tl"
        ? "Permanente nitong buburahin ang iyong account. Hindi na ito maibabalik. Nais mo bang magpatuloy?"
        : "Deleting your account is irreversible. All your data will be permanently removed. Do you wish to continue?"
    );
    if (!confirmed) return;

    try {
      const target = resolvedEmail || currentUser?.email;
      if (target) {
        await fetch(`${API_BASE}/api/users/${encodeURIComponent(target)}`, {
          method: "DELETE",
        });
      }
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      sessionStorage.clear();
      alert(language === "tl" ? "Permanente nang nabura ang iyong account." : "Your account has been permanently deleted.");
      window.location.href = "/login";
    } catch (err) {
      console.error("Deletion error:", err);
      localStorage.removeItem("currentUser");
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };


  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resolvedEmail,
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          suffix: formData.suffix,
          birthMonth: formData.birthMonth,
          birthDay: formData.birthDay,
          birthYear: formData.birthYear,
          bloodType: formData.bloodType || "O+",
          city: formData.city,
          houseNo: formData.houseNo,
          street: formData.street,
          barangay: formData.barangay,
          workingInQC: formData.workingInCity ? "Yes" : "No",
          occupation: formData.occupation,
          sex: formData.sex,
          mobileNumber: formData.mobileNumber,
          profilePhotoUrl: photoUrl,
        }),
      });

      const fullCombinedName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix]
        .filter((part) => part && part.trim().length > 0)
        .join(" ");

      const localUpdated = {
        ...(currentUser || {}),
        firstName: formData.firstName,
        first_name: formData.firstName,
        middleName: formData.middleName,
        middle_name: formData.middleName,
        lastName: formData.lastName,
        last_name: formData.lastName,
        suffix: formData.suffix,
        fullName: fullCombinedName,
        name: fullCombinedName,
        birthMonth: formData.birthMonth,
        birth_month: formData.birthMonth,
        birthDay: formData.birthDay,
        birth_day: formData.birthDay,
        birthYear: formData.birthYear,
        birth_year: formData.birthYear,
        birthDate: `${formData.birthMonth} ${formData.birthDay}, ${formData.birthYear}`,
        birthDateDisplay: `${formData.birthMonth} ${formData.birthDay}, ${formData.birthYear}`,
        bloodType: formData.bloodType || "O+",
        blood_type: formData.bloodType || "O+",
        city: formData.city,
        addressCity: formData.city,
        addressCityMunicipality: formData.city,
        houseNo: formData.houseNo,
        addressHouseNo: formData.houseNo,
        house_no: formData.houseNo,
        street: formData.street,
        addressStreet: formData.street,
        barangay: formData.barangay,
        addressBarangay: formData.barangay,
        workingInQC: formData.workingInCity ? "Yes" : "No",
        working_in_qc: formData.workingInCity ? "Yes" : "No",
        workingInCity: formData.workingInCity,
        occupation: formData.occupation,
        sex: formData.sex,
        gender: formData.sex,
        mobileNumber: formData.mobileNumber,
        mobile_number: formData.mobileNumber,
        contactNo: formData.mobileNumber,
        contact_no: formData.mobileNumber,
        profilePhotoUrl: photoUrl,
        profile_photo_url: photoUrl,
      };

      const data = await res.json();
      if (res.ok && data.success) {
        const finalUser = {
          ...localUpdated,
          ...(data.user || {}),
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          suffix: formData.suffix,
          houseNo: formData.houseNo,
          addressHouseNo: formData.houseNo,
          street: formData.street,
          addressStreet: formData.street,
          barangay: formData.barangay,
          addressBarangay: formData.barangay,
          city: formData.city,
          addressCity: formData.city,
          addressCityMunicipality: formData.city,
          mobileNumber: formData.mobileNumber,
          contactNo: formData.mobileNumber,
          sex: formData.sex,
          gender: formData.sex,
          workingInQC: formData.workingInCity ? "Yes" : "No",
          occupation: formData.occupation,
        };

        setSavedFormData(formData);
        setIsEditing(false);
        try {
          localStorage.setItem("currentUser", JSON.stringify(finalUser));
          sessionStorage.setItem("currentUser", JSON.stringify(finalUser));
          localStorage.setItem("user_profile", JSON.stringify(finalUser));
          sessionStorage.setItem("user_profile", JSON.stringify(finalUser));
          localStorage.setItem("user", JSON.stringify(finalUser));
        } catch {}

        window.dispatchEvent(new Event("user_profile_updated"));
        window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: finalUser }));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("govserve_realtime_event"));
        alert(t("profileUpdatedSuccess") || "Profile updated successfully in database!");
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      const fullCombinedName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix]
        .filter((part) => part && part.trim().length > 0)
        .join(" ");

      const localUpdated = {
        ...(currentUser || {}),
        firstName: formData.firstName,
        first_name: formData.firstName,
        middleName: formData.middleName,
        middle_name: formData.middleName,
        lastName: formData.lastName,
        last_name: formData.lastName,
        suffix: formData.suffix,
        fullName: fullCombinedName,
        name: fullCombinedName,
        birthMonth: formData.birthMonth,
        birth_month: formData.birthMonth,
        birthDay: formData.birthDay,
        birth_day: formData.birthDay,
        birthYear: formData.birthYear,
        birth_year: formData.birthYear,
        birthDate: `${formData.birthMonth} ${formData.birthDay}, ${formData.birthYear}`,
        birthDateDisplay: `${formData.birthMonth} ${formData.birthDay}, ${formData.birthYear}`,
        city: formData.city,
        addressCity: formData.city,
        addressCityMunicipality: formData.city,
        houseNo: formData.houseNo,
        addressHouseNo: formData.houseNo,
        house_no: formData.houseNo,
        street: formData.street,
        addressStreet: formData.street,
        barangay: formData.barangay,
        addressBarangay: formData.barangay,
        workingInQC: formData.workingInCity ? "Yes" : "No",
        working_in_qc: formData.workingInCity ? "Yes" : "No",
        workingInCity: formData.workingInCity,
        occupation: formData.occupation,
        sex: formData.sex,
        gender: formData.sex,
        mobileNumber: formData.mobileNumber,
        contactNo: formData.mobileNumber,
        profilePhotoUrl: photoUrl,
      };

      try {
        localStorage.setItem("currentUser", JSON.stringify(localUpdated));
        sessionStorage.setItem("currentUser", JSON.stringify(localUpdated));
        localStorage.setItem("user_profile", JSON.stringify(localUpdated));
        sessionStorage.setItem("user_profile", JSON.stringify(localUpdated));
        localStorage.setItem("user", JSON.stringify(localUpdated));
      } catch {}

      window.dispatchEvent(new Event("user_profile_updated"));
      window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: localUpdated }));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("govserve_realtime_event"));
      setSavedFormData(formData);
      setIsEditing(false);
      alert("Profile updated locally.");
    } finally {
      setIsUpdating(false);
    }
  };

  const maskQcid = (value: string) => {
    const visibleCount = 4;
    const masked = value
      .split("")
      .map((char, idx) =>
        idx < value.length - visibleCount && /\d/.test(char) ? "•" : char
      )
      .join("");
    return masked.replace(/(.{5})/g, "$1 ").trim();
  };

  const months = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const displayName =
    [
      savedFormData.firstName,
      savedFormData.middleName,
      savedFormData.lastName,
      savedFormData.suffix,
    ]
      .filter((part) => part && part.trim().length > 0)
      .join(" ") || name;

  const rawRole = (role || currentUser?.role || localStorage.getItem("userRole") || sessionStorage.getItem("userRole") || "user").toLowerCase();
  const isAdmin = rawRole === "admin" || rawRole === "super_admin" || rawRole === "staff";

  const handleModalClose = () => {
    localStorage.removeItem("is_profile_modal_open");
    sessionStorage.removeItem("is_profile_modal_open");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleModalClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-xl relative overflow-hidden text-gray-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Greeting + Identification Section */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? "HI, SYSTEM ADMINISTRATOR!" : t("hiUser", { name: displayName })}
            </h2>
            {isAdmin && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700 uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                Super Admin Access
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {isAdmin ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Building className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Quezon City Social Services &amp; Development Department (SSDD)</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">ADMIN ID: QC-SSDD-001</span>
              </div>
            ) : (
              <>
                <IdCard className="h-4 w-4 text-gray-500 dark:text-slate-400 shrink-0" />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  QCID No:{" "}
                  <span className="font-semibold text-gray-800 dark:text-slate-200 tracking-wide">
                    {showQcid ? resolvedQcid : maskQcid(resolvedQcid)}
                  </span>
                </span>
                <button
                  onClick={() => setShowQcid((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  {showQcid ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {showQcid ? t("hideQcid") : t("viewQcid")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header Banner */}
        <div className="bg-slate-900 px-8 py-5 flex items-center justify-between gap-4 flex-wrap border-y border-slate-800">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative h-14 w-14 shrink-0 group">
              <div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-700 shadow-xs">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="profile-photo-upload"
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                title={photoUrl ? "Palitan ang profile photo" : "Maglagay ng profile photo"}
              >
                <Camera className="h-5 w-5 text-white" />
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-lg md:text-xl truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-300">{t("statusLabel")}</span>
                <span className="inline-flex items-center text-[11px] font-semibold bg-green-500 text-white px-2.5 py-0.5 rounded-full">
                  {t("statusActive")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="profile-photo-upload-btn"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{photoUrl ? "Change Photo" : "Upload Photo"}</span>
            </label>
            <input
              id="profile-photo-upload-btn"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Remove profile photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-6 sm:gap-8 border-b border-gray-200 dark:border-slate-800 px-6 sm:px-8 pt-0 overflow-x-auto">
          <button
            onClick={() => setTab("account")}
            className={`py-4 px-0 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${tab === "account"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
          >
            {t("accountInformation")}
          </button>
          <button
            onClick={() => setTab("personal")}
            className={`py-4 px-0 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${tab === "personal"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
          >
            {t("personalInformation")}
          </button>
          <button
            onClick={() => setTab("devices")}
            className={`py-4 px-0 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${tab === "devices"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
          >
            {t("devicesTab") || "Devices & History"}
          </button>
          <button
            onClick={() => setTab("preferences")}
            className={`py-4 px-0 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${tab === "preferences"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
          >
            {t("languageTab")}
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {tab === "account" && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 block">
                  {t("emailAddress")}
                </label>
                <div className="w-full rounded-lg bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm text-gray-800 dark:text-slate-200 font-mono">
                  {resolvedEmail}
                </div>
              </div>

              {/* Change Password Section */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t("changePassword")}</h4>
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium ${passwordMsg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                      }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                      {t("currentPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        autoComplete="current-password"
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t("enterCurrentPassword")}
                        className="w-full h-10 px-3 pr-10 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                        {t("newPassword")}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          autoComplete="new-password"
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t("enterNewPassword")}
                          className="w-full h-10 px-3 pr-10 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 block">
                        {t("confirmNewPassword")}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          autoComplete="new-password"
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t("repeatNewPassword")}
                          className="w-full h-10 px-3 pr-10 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Password Strength Bar & Requirements */}
                  {newPassword.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-gray-600 dark:text-slate-300">{t("passwordStrengthLabel")}</span>
                          <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-gray-200 dark:bg-slate-700'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-gray-200 dark:bg-slate-700'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-gray-200 dark:bg-slate-700'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-gray-200 dark:bg-slate-700'}`} />
                        </div>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-[11px] space-y-1.5 shadow-2xs">
                        <div className="font-bold text-gray-700 dark:text-slate-200 text-[10px] uppercase tracking-wider">{t("passwordRequirementsTitle")}</div>
                        <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                          {hasMinLength ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                          <span>{t("reqMinLength")}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                          {hasUpper ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                          <span>{t("reqUpper")}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                          {hasNumber ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                          <span>{t("reqNumber")}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                          {hasSpecialChar ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                          <span>{t("reqSpecial")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirm Password Match Indicator */}
                  {confirmPassword.length > 0 && (
                    <div className="pt-0.5 text-[11px]">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> {t("passwordsMatchMsg")}
                        </span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> {t("passwordsMismatchMsg")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !newPassword || !isAllValid}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isChangingPassword ? "Updating..." : t("saveNewPassword")}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === "personal" && (
            isAdmin ? (
              <div className="space-y-6">
                {/* Admin Official Information Card */}
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Administrator Official Identification &amp; Office Details
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Verified Staff
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Designation / Role</span>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">System Administrator</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Department / Bureau</span>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">Social Services Development Dept (SSDD)</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Local Government Unit</span>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">Quezon City Hall Complex</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Official Email Address</span>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5 font-mono">{resolvedEmail || "admin@quezoncity.gov.ph"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Security Access Level</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Full System Super Admin
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Assigned Scope / Sector</span>
                      <p className="font-semibold text-gray-900 dark:text-white mt-0.5">City-Wide (Districts 1 – 6)</p>
                    </div>
                  </div>
                </div>

                {/* System Operational Permissions Matrix */}
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-2xs">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Authorized Operational Capabilities
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-800 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Social Assistance Review &amp; Aid Disbursement</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-800 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Case Management &amp; Welfare Resolution</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-800 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>QCID &amp; Sectoral ID Verification &amp; Printing</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-gray-800 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Realtime Telemetry, Reports &amp; Audit Logs</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t("fullNameHeading")}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("firstName")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          maxLength={50}
                          value={formData.firstName}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("middleNameOptional")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          maxLength={30}
                          value={formData.middleName}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("middleName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 30))
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("lastName")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          maxLength={50}
                          value={formData.lastName}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value.replace(/[^a-zA-ZñÑ\s'-]/g, "").slice(0, 50))
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("suffix")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.suffix}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("suffix", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Birth Date & Blood Type */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t("birthDateHeading")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("month")}
                      </label>
                      <div className="relative">
                        <select
                          value={formData.birthMonth}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("birthMonth", e.target.value)
                          }
                          className={fieldClass()}
                        >
                          {months.map((month) => (
                            <option key={month} value={month}>
                              {month}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("day")}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          autoComplete="off"
                          min="1"
                          max="31"
                          value={formData.birthDay}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("birthDay", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("year")}
                      </label>
                      <div className="relative">
                        <select
                          value={formData.birthYear}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("birthYear", e.target.value)
                          }
                          className={fieldClass()}
                        >
                          {years.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        Blood Type
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.bloodType || "O+"}
                          disabled={true}
                          className="w-full h-10 px-3 text-sm bg-gray-100 dark:bg-slate-800/80 text-gray-800 dark:text-slate-200 font-bold border border-gray-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t("addressHeading")}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("city")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.city}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("houseNoOptional")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.houseNo}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("houseNo", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("street")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.street}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("street", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("barangay")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          value={formData.barangay}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleInputChange("barangay", e.target.value)
                          }
                          className={fieldClass()}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                    {t("employmentDetails")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-3 block">
                        {t("workingInQcQuestion")}
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            autoComplete="off"
                            name="working"
                            checked={formData.workingInCity === true}
                            disabled={!isEditing}
                            onChange={() =>
                              handleInputChange("workingInCity", true)
                            }
                            className="w-4 h-4 disabled:cursor-not-allowed cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 dark:text-slate-300">{t("yes")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            autoComplete="off"
                            name="working"
                            checked={formData.workingInCity === false}
                            disabled={!isEditing}
                            onChange={() =>
                              handleInputChange("workingInCity", false)
                            }
                            className="w-4 h-4 disabled:cursor-not-allowed cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 dark:text-slate-300">{t("no")}</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                        {t("occupation")}
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={formData.occupation}
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleInputChange("occupation", e.target.value)
                        }
                        placeholder={t("enterOccupation")}
                        className={fieldClass()}
                      />
                    </div>
                  </div>
                </div>

                {/* Sex */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                    {t("sex")}
                  </label>
                  <div className="relative">
                    <select
                      value={formData.sex}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange("sex", e.target.value)}
                      className={fieldClass()}
                    >
                      <option value="MALE">{t("genderMale")}</option>
                      <option value="FEMALE">{t("genderFemale")}</option>
                      <option value="OTHER">{t("otherOption")}</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 block">
                    {t("mobileNumber")}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      autoComplete="off"
                      value={formData.mobileNumber}
                      disabled={!isEditing}
                      onChange={(e) =>
                        handleInputChange("mobileNumber", e.target.value)
                      }
                      className={fieldClass()}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="flex-1 h-11 rounded-lg border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {t("cancelBtn")}
                      </button>
                      <button
                        onClick={handleUpdateProfile}
                        disabled={isUpdating}
                        className="flex-1 h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isUpdating ? "Saving..." : t("updateProfile")}
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex justify-center">
                      <button
                        onClick={handleStartEdit}
                        className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-8 py-3 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                      >
                        {t("editProfile")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {tab === "devices" && (
            <div className="space-y-6">
              {/* Header & Log Out Other Devices Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {t("deviceManagement") || "Device Management & Login History"}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleLogoutAllOtherDevices}
                    disabled={isLoggingOutOthers}
                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isLoggingOutOthers ? "Logging out..." : (t("logOutAllOtherDevices") || "Log Out Other Devices")}</span>
                  </button>
                </div>
              </div>

              {deviceActionMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${deviceActionMsg.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{deviceActionMsg.text}</span>
                </div>
              )}

              {/* Active / Current Device Card */}
              {(() => {
                const currentDev = {
                  id: 1,
                  deviceName: "Windows PC • Google Chrome",
                  deviceType: "PC",
                  browser: "Google Chrome",
                  os: "Windows",
                  ipAddress: "127.0.0.1",
                  location: "Quezon City, PH",
                  isActive: true,
                  isCurrentDevice: true,
                  loginAt: new Date().toISOString(),
                  ...(deviceSessions.find((s) => s.isCurrentDevice) || deviceSessions[0] || {}),
                };

                // Real-time client verification for current device
                const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";
                const lowerUa = ua.toLowerCase();
                const isAndroid = /android/i.test(lowerUa);
                const isIOS = /iphone|ipad|ipod/i.test(lowerUa);
                const isRealWindows = (/windows|win32|win64/i.test(lowerUa)) && !isAndroid;
                const isRealMac = (/macintosh|mac os|macos/i.test(lowerUa)) && !isIOS;

                let clientBrowser = "Google Chrome";
                if (/edg/i.test(lowerUa)) clientBrowser = "Microsoft Edge";
                else if (/opr|opera/i.test(lowerUa)) clientBrowser = "Opera";
                else if (/firefox/i.test(lowerUa)) clientBrowser = "Mozilla Firefox";
                else if (/safari/i.test(lowerUa) && !/chrome/i.test(lowerUa)) clientBrowser = "Apple Safari";

                if (isAndroid) {
                  currentDev.os = "Android";
                  if (/tablet/i.test(lowerUa)) {
                    currentDev.deviceType = "Tablet";
                    currentDev.deviceName = `Android Tablet • ${clientBrowser}`;
                  } else {
                    currentDev.deviceType = "CP (Cellphone)";
                    currentDev.deviceName = `Android CP • ${clientBrowser}`;
                  }
                  currentDev.browser = clientBrowser;
                } else if (isIOS) {
                  if (/ipad/i.test(lowerUa)) {
                    currentDev.os = "iPadOS";
                    currentDev.deviceType = "Tablet";
                    currentDev.deviceName = `iPadOS Tablet • ${clientBrowser}`;
                  } else {
                    currentDev.os = "iOS";
                    currentDev.deviceType = "CP (Cellphone)";
                    currentDev.deviceName = `iPhone (CP) • ${clientBrowser}`;
                  }
                  currentDev.browser = clientBrowser;
                } else if (isRealWindows) {
                  currentDev.os = "Windows";
                  currentDev.deviceType = "PC";
                  currentDev.deviceName = `Windows PC • ${clientBrowser}`;
                  currentDev.browser = clientBrowser;
                } else if (isRealMac) {
                  currentDev.os = "macOS";
                  currentDev.deviceType = "PC";
                  currentDev.deviceName = `Mac PC • ${clientBrowser}`;
                  currentDev.browser = clientBrowser;
                }

                const isCP =
                  currentDev.deviceType?.toLowerCase().includes("cp") ||
                  currentDev.deviceType?.toLowerCase().includes("mobile") ||
                  currentDev.deviceName?.toLowerCase().includes("cp") ||
                  (currentDev.os?.toLowerCase().includes("android") && !currentDev.deviceName?.toLowerCase().includes("tablet")) ||
                  currentDev.os?.toLowerCase().includes("iphone") ||
                  currentDev.os?.toLowerCase().includes("ios");

                const isTablet =
                  !isCP &&
                  (currentDev.deviceType?.toLowerCase().includes("tablet") ||
                   currentDev.deviceName?.toLowerCase().includes("tablet") ||
                   currentDev.os?.toLowerCase().includes("ipad"));

                const isStillActive = currentDev.isActive ?? true;

                return (
                  <div className={`rounded-2xl border-2 p-5 shadow-xs relative overflow-hidden transition-all ${isStillActive
                      ? "border-blue-200 dark:border-blue-900/60 bg-linear-to-br from-blue-50/50 via-white to-slate-50 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-900"
                      : "border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/30 ring-1 ring-red-200 dark:ring-red-900/50"
                    }`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 ${isStillActive ? "bg-blue-600" : "bg-red-600"
                          }`}>
                          {isTablet ? (
                            <Tablet className="w-6 h-6" />
                          ) : isCP ? (
                            <Smartphone className="w-6 h-6" />
                          ) : (
                            <Monitor className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {currentDev.deviceName || "Windows PC • Google Chrome"}
                            </span>
                            {isStillActive ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                                {t("activeNow") || "Active Now (This Device)"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 px-2.5 py-0.5 rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                🔴 Session Logged Out (New Device Logged In)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                            <span>OS: <strong className="text-slate-700 dark:text-white font-semibold">{currentDev.os}</strong></span>
                            <span>•</span>
                            <span>Browser: <strong className="text-slate-700 dark:text-white font-semibold">{currentDev.browser}</strong></span>
                            <span>•</span>
                            <span>IP: <strong className="text-slate-700 dark:text-white font-semibold">{currentDev.ipAddress}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Log Out Current Device Action Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              language === "tl"
                                ? "Sigurado ka bang nais mong mag-sign out sa kasalukuyang device na ito?"
                                : "Are you sure you want to log out of this current device?"
                            )
                          ) {
                            sessionStorage.clear();
                            localStorage.removeItem("currentUser");
                            localStorage.removeItem("isAuthenticated");
                            localStorage.removeItem("userRole");
                            localStorage.removeItem("is_profile_modal_open");
                            sessionStorage.removeItem("is_profile_modal_open");
                            window.location.href = "/login";
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs mt-2 sm:mt-0"
                        title={language === "tl" ? "I-logout ang kasalukuyang device na ito" : "Log out of this current device"}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{language === "tl" ? "I-logout ang Device" : "Log Out Device"}</span>
                      </button>
                    </div>

                    {!isStillActive && (
                      <div className="mt-3 p-2.5 bg-red-100/70 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                        <span>{language === "tl" ? "Na-logout ang session sa device na ito dahil nag-login ang account sa ibang device." : "This session was logged out because your account was accessed from another device."}</span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-blue-100/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 dark:text-slate-300 gap-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{t("signedInAt") || "Signed in:"} <strong className="text-slate-900 dark:text-white font-semibold">{formatSessionDate(currentDev.loginAt)}</strong></span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-400">
                        Location: {currentDev.location || "Quezon City, PH"}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Login History / Other Sessions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {language === "tl" ? "Kasaysayan ng Pag-access ng Ibang Device" : "Other Devices & Login History"}
                </h4>

                {isLoadingDevices && deviceSessions.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    Loading login records...
                  </div>
                )}

                {!isLoadingDevices && deviceSessions.filter((s) => !s.isCurrentDevice).length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t("noDevicesFound") || "No other devices have logged in recently."}
                  </div>
                )}

                {!isLoadingDevices &&
                  deviceSessions
                    .filter((s) => !s.isCurrentDevice)
                    .map((session) => {
                      const isCP =
                        session.deviceType?.toLowerCase().includes("cp") ||
                        session.deviceType?.toLowerCase().includes("mobile") ||
                        session.deviceName?.toLowerCase().includes("cp") ||
                        (session.os?.toLowerCase().includes("android") && !session.deviceName?.toLowerCase().includes("tablet")) ||
                        session.os?.toLowerCase().includes("iphone") ||
                        session.os?.toLowerCase().includes("ios");

                      const isTablet =
                        !isCP &&
                        (session.deviceType?.toLowerCase().includes("tablet") ||
                         session.deviceName?.toLowerCase().includes("tablet") ||
                         session.os?.toLowerCase().includes("ipad"));

                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl border p-4 transition-all ${session.isActive
                              ? "border-red-300 dark:border-red-900/70 bg-red-50/60 dark:bg-red-950/30 shadow-xs ring-1 ring-red-200 dark:ring-red-900/50"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-800"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${session.isActive
                                    ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300"
                                  }`}
                              >
                                {isTablet ? (
                                  <Tablet className="w-5 h-5" />
                                ) : isCP ? (
                                  <Smartphone className="w-5 h-5" />
                                ) : (
                                  <Monitor className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                                    {session.deviceName || "Device Session"}
                                  </span>
                                  {session.isActive ? (
                                    <span className="text-[10px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-800 flex items-center gap-1 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                      🔴 Active (New Logged-In Device)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                      {t("terminatedStatus") || "Logged Out"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span>OS: <strong className="text-slate-700 dark:text-white font-semibold">{session.os}</strong></span>
                                  <span>•</span>
                                  <span>Browser: <strong className="text-slate-700 dark:text-white font-semibold">{session.browser}</strong></span>
                                  <span>•</span>
                                  <span>IP: <strong className="text-slate-700 dark:text-white font-semibold">{session.ipAddress}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Remove Single Device Record Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveDevice(session.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/70 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title={language === "tl" ? "Alisin ang device na ito sa listahan" : "Remove this device record"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{language === "tl" ? "Alisin" : "Remove"}</span>
                            </button>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
                              <span>
                                {t("signedInAt") || "Signed in:"}{" "}
                                <strong className="text-slate-700 dark:text-slate-200 font-medium">
                                  {formatSessionDate(session.loginAt)}
                                </strong>
                              </span>
                            </div>
                            {session.logoutAt && (
                              <div className="text-slate-400 dark:text-slate-400">
                                {t("signedOutAt") || "Signed out:"}{" "}
                                <span className="text-slate-600 dark:text-slate-300 font-medium">{formatSessionDate(session.logoutAt)}</span>
                                {session.logoutReason ? ` (${session.logoutReason})` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}

          {tab === "preferences" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                  {t("languageTab")}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  {t("chooseLanguageDesc")}
                </p>
                <div className="space-y-2">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLanguage(option.value)}
                      className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${language === option.value
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      {option.label}
                      {language === option.value && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="mt-8 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{t("dangerZone")}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              {t("dangerZoneDesc")}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeactivate}
                className="flex-1 h-11 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors active:scale-95 cursor-pointer shadow-xs"
              >
                {t("deactivateAccount")}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 rounded-lg border-2 border-red-600 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors active:scale-95 cursor-pointer"
              >
                {t("deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
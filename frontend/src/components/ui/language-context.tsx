import { createContext, useContext, useState, type ReactNode } from "react"

/*
  Language context — English / Tagalog / Bisaya toggle.
  Wrap the app with <LanguageProvider> (done in App.tsx) and call
  useLanguage() anywhere to read `language`, call `setLanguage`, or
  translate a known key with `t("someKey")`.

  Add more keys here as more pages get wired up. If a key is missing,
  t() just falls back to the key itself so nothing breaks.
*/

export type Language = "en" | "tl" | "bis"

const translations: Record<string, { en: string; tl: string; bis: string }> = {
  // Common
  settings: { en: "Settings", tl: "Mga Setting", bis: "Mga Setting" },
  profile: { en: "Profile", tl: "Profile", bis: "Profile" },
  logOut: { en: "Log Out", tl: "Mag-logout", bis: "Mag-logout" },
  language: { en: "Language", tl: "Wika", bis: "Pinulongan" },
  english: { en: "English", tl: "Ingles", bis: "Ingles" },
  tagalog: { en: "Tagalog", tl: "Tagalog", bis: "Tagalog" },
  bisaya: { en: "Bisaya", tl: "Bisaya", bis: "Binisaya" },
  darkMode: { en: "Dark Mode", tl: "Dark Mode", bis: "Dark Mode" },
  close: { en: "Close", tl: "Isara", bis: "Isira" },
  save: { en: "Save", tl: "I-save", bis: "I-save" },
  cancel: { en: "Cancel", tl: "Kanselahin", bis: "Kanselaha" },
  notifications: { en: "Notifications", tl: "Mga Abiso", bis: "Mga Pahibalo" },
  helpAndGuides: { en: "Help & guides", tl: "Tulong at Gabay", bis: "Tabang ug Giya" },

  // Brand / sidebar shell
  socialServicesManagement: { en: "Social Services Management", tl: "Pangasiwaan ng Serbisyong Panlipunan", bis: "Pagdumala sa Serbisyo Sosyal" },
  socialServices: { en: "Social Services", tl: "Serbisyong Panlipunan", bis: "Serbisyo Sosyal" },
  residentPortal: { en: "Resident Portal", tl: "Portal ng Residente", bis: "Portal sa Residente" },
  applyForAssistance: { en: "Apply for Assistance", tl: "Mag-apply ng Tulong", bis: "Mag-apply og Tabang" },
  modules: { en: "Modules", tl: "Mga Module", bis: "Mga Module" },
  views: { en: "Views", tl: "Mga View", bis: "Mga View" },

  // Resident sidebar nav
  navServiceGuide: { en: "Help & Service Guide", tl: "Tulong at Gabay", bis: "Tabang ug Giya" },
  navAICS: { en: "AICS", tl: "AICS", bis: "AICS" },
  navAICSAssistance: { en: "AICS Assistance", tl: "Tulong ng AICS", bis: "Tabang sa AICS" },
  navPWDServices: { en: "PWD Services", tl: "Serbisyo para sa PWD", bis: "Serbisyo para sa PWD" },
  navNewPwdId: { en: "New App PWD ID", tl: "Bagong Aplikasyon PWD ID", bis: "Bag-ong Aplikasyon PWD ID" },
  navRenewalPwdId: { en: "Renewal PWD ID", tl: "Pag-renew ng PWD ID", bis: "Pag-renew sa PWD ID" },
  navPwdAssistance: { en: "PWD Social Assistance", tl: "Tulong Pinansyal sa PWD", bis: "Tabang Pinansyal sa PWD" },
  navLossPwdId: { en: "Replacement / Lost PWD ID", tl: "Nawalang PWD ID / Pagpapalit", bis: "Nawala nga PWD ID / Pag-ilis" },
  navSeniorServices: { en: "Senior Citizen Services", tl: "Serbisyo sa Senior Citizen", bis: "Serbisyo sa Senior Citizen" },
  navNewSeniorId: { en: "New App SENIOR ID", tl: "Bagong Aplikasyon SENIOR ID", bis: "Bag-ong Aplikasyon SENIOR ID" },
  navRenewalSeniorId: { en: "Renewal SENIOR ID", tl: "Pag-renew ng SENIOR ID", bis: "Pag-renew sa SENIOR ID" },
  navLossSeniorId: { en: "Replacement / Lost Senior ID", tl: "Nawalang Senior ID / Pagpapalit", bis: "Nawala nga Senior ID / Pag-ilis" },
  navSeniorMedicineBooklet: { en: "Medicine Discount Booklet", tl: "Medicine Discount Booklet", bis: "Medicine Discount Booklet" },
  navSeniorMovieBooklet: { en: "Free Movie Booklet", tl: "Libreng Movie Booklet", bis: "Libre nga Movie Booklet" },
  navSeniorSocialAssistance: { en: "Senior Social Assistance", tl: "Tulong Panlipunan sa Senior", bis: "Tabang Panlipunan sa Senior" },
  navSoloParentServices: { en: "Solo Parent Services", tl: "Serbisyo sa Solo Parent", bis: "Serbisyo sa Solo Parent" },
  navNewSoloParent: { en: "New / Apply Solo Parent ID", tl: "Bagong Aplikasyon Solo Parent ID", bis: "Bag-ong Aplikasyon Solo Parent ID" },
  navRenewalSoloParent: { en: "Renewal Solo Parent ID", tl: "Pag-renew ng Solo Parent ID", bis: "Pag-renew sa Solo Parent ID" },
  navLossSoloParent: { en: "Replacement / Lost ID", tl: "Nawalang ID / Pagpapalit", bis: "Nawala nga ID / Pag-ilis" },
  navChildWelfareServices: { en: "Child Welfare Services", tl: "Kapakanan ng Bata", bis: "Kaayohan sa Bata" },
  navChildWelfareApp: { en: "Child Welfare Application", tl: "Aplikasyon sa Kapakanan ng Bata", bis: "Aplikasyon sa Kaayohan sa Bata" },
  navChildNutritional: { en: "Nutritional Assistance", tl: "Nutritional Assistance", bis: "Nutritional Assistance" },
  navChildProtection: { en: "Child Protection Assistance", tl: "Child Protection Assistance", bis: "Child Protection Assistance" },
  navChildEmergency: { en: "Emergency Assistance", tl: "Emergency Assistance", bis: "Emergency Assistance" },
  navChildPsychosocial: { en: "Psychosocial Support", tl: "Psychosocial Support", bis: "Psychosocial Support" },
  navChildShelter: { en: "Temporary Shelter / Care", tl: "Temporary Shelter / Care", bis: "Temporary Shelter / Care" },
  navChildParenting: { en: "Family / Parenting Support", tl: "Family / Parenting Support", bis: "Family / Parenting Support" },
  navLivelihoodTraining: { en: "Livelihood & Training", tl: "Kabuhayan at Pagsasanay", bis: "Panginabuhi ug Pagbansay" },
  navLivelihoodProgram: { en: "Livelihood Program", tl: "Programa sa Kabuhayan", bis: "Programa sa Panginabuhi" },
  navTrainingProgram: { en: "Training Program", tl: "Programa sa Pagsasanay", bis: "Programa sa Pagbansay" },
  navOtherPrograms: { en: "Other Programs", tl: "Ibang Programa", bis: "Ubang Programa" },
  navTrackApplication: { en: "Track Application", tl: "Subaybayan ang Aplikasyon", bis: "Subaya ang Aplikasyon" },
  navMyApplications: { en: "Application History", tl: "Application History", bis: "Application History" },
  navHistories: { en: "Histories", tl: "Histories", bis: "Histories" },
  newBadge: { en: "{count} new", tl: "{count} bago", bis: "{count} bag-o" },
  noNewNotifications: { en: "No new notifications.", tl: "Walang bagong notification.", bis: "Walay bag-ong pahibalo." },
  collapseSidebar: { en: "Collapse sidebar", tl: "I-collapse ang sidebar", bis: "I-collapse ang sidebar" },
  expandSidebar: { en: "Expand sidebar", tl: "I-expand ang sidebar", bis: "I-expand ang sidebar" },

  // Profile Modal & Language
  hiUser: { en: "Hi, {name}!", tl: "Kamusta, {name}!", bis: "Kumusta, {name}!" },
  hiUserShort: { en: "Hi, {name}", tl: "Kamusta, {name}", bis: "Kumusta, {name}" },
  statusActive: { en: "Active", tl: "Aktibo", bis: "Aktibo" },
  statusLabel: { en: "Status:", tl: "Status:", bis: "Status:" },
  viewQcid: { en: "View QCID", tl: "Tingnan ang QCID", bis: "Tan-awa ang QCID" },
  hideQcid: { en: "Hide QCID", tl: "Itago ang QCID", bis: "Tagoa ang QCID" },
  accountInformation: { en: "Account Information", tl: "Impormasyon ng Account", bis: "Impormasyon sa Account" },
  personalInformation: { en: "Personal Information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  languageTab: { en: "Language", tl: "Wika", bis: "Pinulongan" },
  chooseLanguageDesc: { en: "Choose the language used across the portal.", tl: "Piliin ang wikang gagamitin sa buong portal.", bis: "Pilia ang pinulongan nga gamiton sa tibuok portal." },
  dangerZone: { en: "Danger Zone", tl: "Panganib na Sona", bis: "Delikado nga Sona" },
  dangerZoneDesc: {
    en: "Deactivating your account is a permanent action. All your data will be removed and you will lose access to the portal.",
    tl: "Ang pag-deactivate ng iyong account ay permanente. Matatanggal ang lahat ng iyong impormasyon at mawawalan ka ng access sa portal.",
    bis: "Ang pag-deactivate sa imong account permanente. Matangtang ang tanan nimong impormasyon ug mawad-an ka og access sa portal."
  },
  deactivateAccount: { en: "Deactivate Account", tl: "I-deactivate ang Account", bis: "I-deactivate ang Account" },
  deleteAccount: { en: "Delete Account", tl: "I-delete ang Account", bis: "I-delete ang Account" },
  editProfile: { en: "Edit Profile", tl: "I-edit ang Profile", bis: "I-edit ang Profile" },
  updateProfile: { en: "Update Profile", tl: "I-update ang Profile", bis: "I-update ang Profile" },
  cancelBtn: { en: "Cancel", tl: "Kanselahin", bis: "Kanselaha" },
  changePassword: { en: "Change Password", tl: "Palitan ang Password", bis: "Ilisi ang Password" },
  currentPassword: { en: "Current Password", tl: "Kasalukuyang Password", bis: "Karon nga Password" },
  newPassword: { en: "New Password", tl: "Bagong Password", bis: "Bag-ong Password" },
  confirmNewPassword: { en: "Confirm New Password", tl: "Kumpirmahin ang Bagong Password", bis: "Kumpirmaha ang Bag-ong Password" },
  saveNewPassword: { en: "Save New Password", tl: "I-save ang Bagong Password", bis: "I-save ang Bag-ong Password" },
  enterCurrentPassword: { en: "Enter current password", tl: "Ilagay ang kasalukuyang password", bis: "Ibutang ang karon nga password" },
  enterNewPassword: { en: "Min. 8 characters", tl: "Min. 8 na karakter", bis: "Min. 8 ka karakter" },
  repeatNewPassword: { en: "Repeat new password", tl: "Ulitin ang bagong password", bis: "Balika ang bag-ong password" },
  passwordStrengthLabel: { en: "Password Strength:", tl: "Lakas ng Password:", bis: "Kusog sa Password:" },
  strengthWeak: { en: "Weak", tl: "Mahina", bis: "Huyang" },
  strengthFair: { en: "Fair", tl: "Katamtaman", bis: "Medyo Kusog" },
  strengthGood: { en: "Good", tl: "Maganda", bis: "Kusog" },
  strengthStrong: { en: "Strong & Secure", tl: "Napakalakas at Ligtas", bis: "Kusog kaayo ug Luwas" },
  passwordRequirementsTitle: { en: "PASSWORD REQUIREMENTS:", tl: "MGA KAILANGAN SA PASSWORD:", bis: "MGA KINAHANGLAN SA PASSWORD:" },
  reqMinLength: { en: "At least 8 characters long", tl: "Hindi bababa sa 8 characters", bis: "Dili moubos sa 8 ka characters" },
  reqUpper: { en: "At least 1 uppercase letter (A-Z)", tl: "May kahit 1 uppercase letter (A-Z)", bis: "Adunay labing menos 1 ka dako nga letra (A-Z)" },
  reqNumber: { en: "At least 1 number (0-9)", tl: "May kahit 1 number (0-9)", bis: "Adunay labing menos 1 ka numero (0-9)" },
  reqSpecial: { en: "At least 1 special character (e.g. @, #, $, !, %)", tl: "May kahit 1 special character (e.g. @, #, $, !, %)", bis: "Adunay labing menos 1 ka espesyal nga karakter (e.g. @, #, $, !, %)" },
  passwordsMatchMsg: { en: "Passwords match", tl: "Magkatugma ang password", bis: "Nagtakdo ang password" },
  passwordsMismatchMsg: { en: "Passwords do not match", tl: "Hindi magkatugma ang password", bis: "Dili nagtakdo ang password" },
  pleaseEnterNewPassword: { en: "Please enter your new password.", tl: "Paki-lagay ang iyong bagong password.", bis: "Palihug ibutang ang imong bag-ong password." },
  pleaseFollowRequirements: { en: "Please fulfill all password requirements.", tl: "Pakisunod ang lahat ng mga kailangan sa password.", bis: "Palihug tumana ang tanang gikinahanglan sa password." },
  passwordChangeSuccess: { en: "Password changed successfully!", tl: "Matagumpay na napalitan ang iyong password!", bis: "Malamposong nailisan ang imong password!" },
  passwordChangeFailed: { en: "Failed to update password. Please check your inputs.", tl: "Bigo sa pagpalit ng password. Pakisuri muli.", bis: "Napakyas sa pag-ilis sa password. Palihug susiha pag-usab." },
  registrationBy: { en: "Registration by:", tl: "Paraan ng Pagpaparehistro:", bis: "Pamaagi sa Pagparehistro:" },
  devicesTab: { en: "Devices & History", tl: "Mga Device", bis: "Mga Device" },
  deviceManagement: { en: "Device Management & Login History", tl: "Pamamahala ng Device at Kasaysayan ng Pag-access", bis: "Pagdumala sa Device ug Kasaysayan" },
  deviceManagementDesc: {
    en: "Real-time list of devices (PC, Mobile, Tablet) that have accessed your account with exact login date and time.",
    tl: "Real-time na talaan ng mga device (PC, Mobile, Tablet) na gumamit ng iyong account, may kasamang eksaktong petsa at oras.",
    bis: "Talaan sa mga device (PC, Mobile, Tablet) nga migamit sa imong account uban ang eksaktong petsa ug oras."
  },
  currentDeviceBadge: { en: "Current Device (Active)", tl: "Kasalukuyang Device (Aktibo)", bis: "Karon nga Device (Aktibo)" },
  activeNow: { en: "Active Now", tl: "Aktibo Ngayon", bis: "Aktibo Karon" },
  terminatedStatus: { en: "Terminated / Logged Out", tl: "Nai-logout / Natapos", bis: "Naka-logout / Nahuman" },
  logOutAllOtherDevices: { en: "Log Out All Other Devices", tl: "I-logout ang Lahat ng Ibang Device", bis: "I-logout ang Tanang Ubang Device" },
  signedInAt: { en: "Signed in:", tl: "Nag-sign in noong:", bis: "Ni-sign in kaniadtong:" },
  signedOutAt: { en: "Signed out:", tl: "Nag-sign out noong:", bis: "Ni-sign out kaniadtong:" },
  noDevicesFound: { en: "No other login history recorded.", tl: "Walang ibang kasaysayan ng pag-login.", bis: "Walay ubang kasaysayan sa pag-login." },

  emailAddress: { en: "Email Address", tl: "Email Address", bis: "Email Address" },
  fullNameHeading: { en: "Full Name", tl: "Buong Pangalan", bis: "Tibuok Ngalan" },
  firstName: { en: "First Name", tl: "Pangalan", bis: "Ngalan" },
  middleNameOptional: { en: "Middle Name (Optional)", tl: "Gitnang Pangalan (Opsyonal)", bis: "Tunga nga Ngalan (Opsyonal)" },
  lastName: { en: "Last Name", tl: "Apelyido", bis: "Apelyido" },
  suffix: { en: "Suffix", tl: "Suffix", bis: "Suffix" },
  birthDateHeading: { en: "Birth Date", tl: "Petsa ng Kapanganakan", bis: "Petsa sa Pagkatawo" },
  month: { en: "Month", tl: "Buwan", bis: "Bulan" },
  day: { en: "Day", tl: "Araw", bis: "Adlaw" },
  year: { en: "Year", tl: "Taon", bis: "Tuig" },
  addressHeading: { en: "Address", tl: "Tirahan / Address", bis: "Pinuy-anan / Address" },
  city: { en: "City", tl: "Lungsod / Siyudad", bis: "Dakbayan / Siyudad" },
  houseNoOptional: { en: "House No. (Optional)", tl: "Numero ng Bahay (Opsyonal)", bis: "Numero sa Balay (Opsyonal)" },
  street: { en: "Street", tl: "Kalye", bis: "Dalan" },
  barangay: { en: "Barangay", tl: "Barangay", bis: "Barangay" },
  employmentDetails: { en: "Employment Details", tl: "Detalye ng Trabaho", bis: "Detalye sa Trabaho" },
  workingInQcQuestion: { en: "Are you working in Quezon City?", tl: "Nagtatrabaho ka ba sa Quezon City?", bis: "Nagtrabaho ba ka sa Quezon City?" },
  occupation: { en: "Occupation", tl: "Trabaho / Propesyon", bis: "Trabaho / Propesyon" },
  enterOccupation: { en: "Enter your occupation", tl: "Ilagay ang iyong trabaho", bis: "Ibutang ang imong trabaho" },
  sex: { en: "Sex", tl: "Kasarian", bis: "Sekso" },
  mobileNumber: { en: "Mobile Number", tl: "Numero ng Mobile", bis: "Numero sa Mobile" },
  profileUpdatedSuccess: { en: "Profile updated successfully!", tl: "Matagumpay na na-update ang profile!", bis: "Malamposong na-update ang profile!" },

  // Common Wizard & Requirements Modal
  iUnderstand: { en: "I UNDERSTAND", tl: "NAIINTINDIHAN KO", bis: "NASABTAN NAKO" },
  requirementsAcceptCheckbox: {
    en: "I accept and understand the documentary requirements for this service",
    tl: "Tinatanggap at nauunawaan ko ang mga dokumentaryong kinakailangan para sa serbisyong ito",
    bis: "Gidawat ug nasabtan nako ang mga gikinahanglan nga dokumento para niini nga serbisyo"
  },
  requirementsReviewHeader: {
    en: "Please Review the Following Documentary Requirements for this Service",
    tl: "Mangyaring Suriin ang mga Sumusunod na Dokumentaryong Kinakailangan para sa Serbisyong ito",
    bis: "Palihug Susiha ang mga Sumusunod nga Gikinahanglan nga Dokumento para niini nga Serbisyo"
  },
  livelihoodBusinessPlan: { en: "Business Plan", tl: "Plano sa Negosyo", bis: "Plano sa Negosyo" },

  // Staff sidebar nav (module labels)
  navPWDSenior: { en: "PWD & Senior Citizen Services", tl: "Serbisyo para sa PWD at Senior Citizen", bis: "Serbisyo para sa PWD ug Senior Citizen" },
  navSoloParent: { en: "Solo Parent & Child Welfare", tl: "Solo Parent at Kapakanan ng Bata", bis: "Solo Parent ug Kaayohan sa Bata" },
  navLivelihood: { en: "Livelihood & Training Program", tl: "Programa sa Kabuhayan at Pagsasanay", bis: "Programa sa Panginabuhi ug Pagbansay" },
  navFinancialAid: { en: "Financial Aid Disbursement", tl: "Paglabas ng Tulong Pinansyal", bis: "Paghatag og Tabang Pinansyal" },
  navMyApplicationsDuplicate: { en: "Application History", tl: "Application History", bis: "Application History" },

  // App header (staff)
  toggleSidebar: { en: "Toggle sidebar", tl: "I-toggle ang sidebar", bis: "I-toggle ang sidebar" },
  switchToLightMode: { en: "Switch to light mode", tl: "Lumipat sa light mode", bis: "Balhin sa light mode" },
  switchToDarkMode: { en: "Switch to dark mode", tl: "Lumipat sa dark mode", bis: "Balhin sa dark mode" },
  viewFullDocumentation: { en: "View full documentation", tl: "Tingnan ang buong dokumentasyon", bis: "Tan-awa ang tibuok dokumentasyon" },
  viewAllNotifications: { en: "View all notifications", tl: "Tingnan lahat ng abiso", bis: "Tan-awa tanang pahibalo" },
  newLabel: { en: "new", tl: "bago", bis: "bag-o" },
  socialWorker: { en: "Social Worker", tl: "Social Worker", bis: "Social Worker" },
  staffRole: { en: "Staff", tl: "Staff", bis: "Staff" },
  residentRole: { en: "Resident", tl: "Residente", bis: "Residente" },
  applicantRole: { en: "Applicant", tl: "Aplikante", bis: "Aplikante" },

  // Help topics (staff header)
  helpAicsTitle: { en: "Processing AICS applications", tl: "Pagpoproseso ng aplikasyon sa AICS", bis: "Pagproseso sa aplikasyon sa AICS" },
  helpAicsDesc: { en: "How to review submissions, run verification, and release assistance.", tl: "Paano suriin ang mga isinumite, mag-verify, at maglabas ng tulong.", bis: "Giunsa pagrepaso sa mga isumite, pag-verify, ug paghatag og tabang." },
  helpPwdTitle: { en: "PWD & Senior Citizen ID issuance", tl: "Pagbigay ng ID sa PWD at Senior Citizen", bis: "Pagpagawas og ID sa PWD ug Senior Citizen" },
  helpPwdDesc: { en: "Registration, medical verification, and benefits activation steps.", tl: "Mga hakbang sa pagpaparehistro, medical verification, at pag-activate ng benepisyo.", bis: "Mga lakang sa pagparehistro, medical verification, ug pag-activate sa benepisyo." },
  helpSoloTitle: { en: "Solo Parent & child welfare", tl: "Solo Parent at kaso ng kapakanan ng bata", bis: "Solo Parent ug mga kaso sa kaayohan sa bata" },
  helpSoloDesc: { en: "Document review, interview, and approval workflow.", tl: "Pagsusuri ng dokumento, panayam, at proseso ng pag-apruba.", bis: "Pagrepaso sa dokumento, pakigsulti, ug proseso sa pag-apruba." },
  helpLivelihoodTitle: { en: "Livelihood & training enrollment", tl: "Pagpapatala sa kabuhayan at pagsasanay", bis: "Pagpatala sa panginabuhi ug pagbansay" },
  helpLivelihoodDesc: { en: "Skills assessment, batch assignment, and certification.", tl: "Pagsusuri ng kasanayan, pagtalaga ng batch, at sertipikasyon.", bis: "Pagsusi sa kahanas, pagtudlo og batch, ug sertipikasyon." },
  helpDisbursementTitle: { en: "Tracking disbursements", tl: "Pagsubaybay sa paglabas ng tulong", bis: "Pagsubay sa paghatag og tabang" },
  helpDisbursementDesc: { en: "How releases are logged across all assistance programs.", tl: "Paano naitala ang mga paglabas sa lahat ng programa ng tulong.", bis: "Giunsa pagtala ang mga paghatag sa tanang programa sa tabang." },

  // Notifications mock (staff header)
  notifAicsTitle: { en: "New AICS submission", tl: "Bagong isinumiteng AICS", bis: "Bag-ong isumite nga AICS" },
  notifAicsDesc: { en: "Liza P. Gonzales filed a medical assistance request.", tl: "Nag-file si Liza P. Gonzales ng kahilingan sa tulong medikal.", bis: "Si Liza P. Gonzales nag-file og hangyo sa tabang medikal." },
  notifPwdTitle: { en: "PWD application approved", tl: "Naaprubahan ang aplikasyon ng PWD", bis: "Naaprubahan ang aplikasyon sa PWD" },
  notifPwdDesc: { en: "Julius P. Cabrera's PWD ID has been approved.", tl: "Naaprubahan na ang PWD ID ni Julius P. Cabrera.", bis: "Naaprubahan na ang PWD ID ni Julius P. Cabrera." },
  notifFinancialTitle: { en: "Financial aid released", tl: "Nailabas na ang tulong pinansyal", bis: "Nahatag na ang tabang pinansyal" },
  notifFinancialDesc: { en: "₱8,500 released to Marites A. Bautista.", tl: "₱8,500 ang nailabas kay Marites A. Bautista.", bis: "₱8,500 ang nahatag kang Marites A. Bautista." },
  notifTime5min: { en: "5 min ago", tl: "5 minuto ang nakalipas", bis: "5 minuto ang milabay" },
  notifTime1hour: { en: "1 hour ago", tl: "1 oras ang nakalipas", bis: "1 oras ang milabay" },
  notifTimeYesterday: { en: "Yesterday", tl: "Kahapon", bis: "Kagahapon" },

  // Resident AICS page (aics-user.tsx)
  aicsWelcome: { en: "Welcome back, {name}. Here's what you can apply for.", tl: "Maligayang pagbabalik, {name}. Ito ang mga puwede mong i-apply.", bis: "Maayong pagbalik, {name}. Kini ang imong mahimong i-apply." },
  aicsAssistance: { en: "AICS ASSISTANCE", tl: "TULONG NG AICS", bis: "TABANG SA AICS" },
  aicsMedical: { en: "Medical Assistance", tl: "Tulong Medikal", bis: "Tabang Medikal" },
  aicsFuneral: { en: "Funeral Assistance", tl: "Tulong sa Libing", bis: "Tabang sa Lubong" },
  aicsTransportation: { en: "Transportation Assistance", tl: "Tulong sa Pamasahe", bis: "Tabang sa Pamasahe" },
  aicsMaterial: { en: "Material Assistance", tl: "Tulong na Materyales", bis: "Tabang nga Materyales" },
  aicsFood: { en: "Food Assistance", tl: "Tulong na Pagkain", bis: "Tabang nga Pagkaon" },
  aicsCashRelief: { en: "Cash Relief Assistance", tl: "Tulong na Pera", bis: "Tabang nga Kwarta" },
  aicsFooterNote: {
    en: "Pick the type of assistance above to start your application. Bring a valid government-issued ID and Barangay Certificate of Indigency, plus the specific requirements for your assistance type, when a social worker asks you to visit for verification.",
    tl: "Piliin ang uri ng tulong sa itaas para simulan ang iyong application. Magdala ng valid na government ID at Barangay Certificate of Indigency, kasama ang mga partikular na kailangan para sa uri ng tulong mo, kapag hinilingan ka ng social worker na bisitahin sila para sa verification.",
    bis: "Pilia ang matang sa tabang sa taas para magsugod sa imong aplikasyon. Pagdala og balido nga government ID ug Barangay Certificate of Indigency, dugang sa mga espesipikong kinahanglanon para sa imong matang sa tabang, kung hangyoon ka sa social worker nga mobisita para sa verification.",
  },
  back: { en: "← Back to AICS", tl: "← Bumalik sa AICS", bis: "← Balik sa AICS" },

  // apply-aics.tsx form
  applyAicsTitle: { en: "Apply for AICS assistance", tl: "Mag-apply ng tulong sa AICS", bis: "Mag-apply og tabang sa AICS" },
  applyAicsDesc: {
    en: "Fill out this form to request Assistance to Individuals in Crisis Situations. A social worker will review your application and contact you for the next steps.",
    tl: "Punan ang form na ito para humingi ng Tulong sa mga Taong Nasa Krisis. Susuriin ng social worker ang iyong aplikasyon at kokontakin ka para sa susunod na hakbang.",
    bis: "Sudlan kini nga porma aron mangayo og Tabang sa mga Tawo nga Naa sa Krisis. Susihon sa social worker ang imong aplikasyon ug kontakon ka para sa sunod nga lakang.",
  },
  applicantInformation: { en: "Applicant information", tl: "Impormasyon ng Aplikante", bis: "Impormasyon sa Aplikante" },
  fullName: { en: "Full name", tl: "Buong Pangalan", bis: "Tibuok Ngalan" },
  contactNumber: { en: "Contact number", tl: "Numero ng Contact", bis: "Numero sa Kontak" },
  address: { en: "Address", tl: "Address", bis: "Address" },
  typeOfAssistance: { en: "Type of assistance", tl: "Uri ng Tulong", bis: "Matang sa Tabang" },
  situationReason: { en: "Situation / reason for request", tl: "Sitwasyon / Dahilan ng Kahilingan", bis: "Sitwasyon / Rason sa Hangyo" },
  situationPlaceholder: { en: "Briefly describe your crisis situation...", tl: "Ilarawan nang maikli ang iyong sitwasyon...", bis: "Ihulagway sa mubo ang imong sitwasyon sa krisis..." },
  submitApplication: { en: "Submit application", tl: "Isumite ang Aplikasyon", bis: "Isumite ang Aplikasyon" },
  applicationSubmittedTitle: { en: "Application submitted", tl: "Naisumite na ang Aplikasyon", bis: "Naisumite na ang Aplikasyon" },
  referenceNumber: { en: "Reference number", tl: "Numero ng Reference", bis: "Numero sa Reference" },
  saveReferenceNote: { en: "Save this reference number to track your application status.", tl: "I-save ang reference number na ito para masubaybayan ang status ng aplikasyon mo.", bis: "I-save kini nga reference number para masubay ang status sa imong aplikasyon." },
  appSubmittedMsg: {
    en: "Thank you, {name}. Your {type} request has been received and is now pending review by a social worker.",
    tl: "Salamat, {name}. Natanggap na ang kahilingan mong {type} at nakabinbin na para masuri ng social worker.",
    bis: "Salamat, {name}. Nadawat na ang imong hangyo nga {type} ug naghulat na kini nga repasohon sa social worker.",
  },
  bringDocsNote: {
    en: "You will need to bring supporting documents (valid ID, Barangay Certificate of Indigency, and type-specific requirements) when you visit your barangay social welfare office for verification.",
    tl: "Kailangan mong magdala ng mga kailangang dokumento (valid ID, Barangay Certificate of Indigency, at mga partikular na kailangan) kapag bumisita ka sa barangay social welfare office para sa verification.",
    bis: "Kinahanglan nimo dad-on ang mga suporta nga dokumento (balido nga ID, Barangay Certificate of Indigency, ug mga espesipikong kinahanglanon) kung mobisita ka sa barangay social welfare office para sa verification.",
  },
  attachSupportingDocument: { en: "Attach supporting document (optional)", tl: "Maglakip ng suportang dokumento (opsyonal)", bis: "Idugang ang suporta nga dokumento (opsyonal)" },
  attachHint: { en: "Upload a photo of your valid ID or requirement (JPG or PNG, max 5MB).", tl: "Mag-upload ng larawan ng iyong valid ID o requirement (JPG o PNG, max 5MB).", bis: "I-upload ang litrato sa imong balido nga ID o requirement (JPG o PNG, max 5MB)." },
  chooseImage: { en: "Choose image", tl: "Pumili ng larawan", bis: "Pagpili og litrato" },
  changeImage: { en: "Change image", tl: "Palitan ang larawan", bis: "Ilisi ang litrato" },
  removeImage: { en: "Remove", tl: "Alisin", bis: "Tangtanga" },
  assistMedical: { en: "Medical assistance", tl: "Tulong medikal", bis: "Tabang medikal" },
  assistBurial: { en: "Burial assistance", tl: "Tulong sa libing", bis: "Tabang sa lubong" },
  assistEducational: { en: "Educational assistance", tl: "Tulong pang-edukasyon", bis: "Tabang pang-edukasyon" },
  assistTransportationLower: { en: "Transportation assistance", tl: "Tulong sa pamasahe", bis: "Tabang sa pamasahe" },

  // Wizard tabs
  wizardChecklist: { en: "Complete checklist", tl: "Kumpletuhin ang Checklist", bis: "Kumpletoha ang Checklist" },
  wizardPersonal: { en: "Personal information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  wizardDocuments: { en: "Submit documents", tl: "Magsumite ng Dokumento", bis: "Isumite ang Dokumento" },
  wizardReview: { en: "Review & submit", tl: "Suriin at Isumite", bis: "Susiha ug Isumite" },
  wizardAppointment: { en: "Set an appointment", tl: "Mag-set ng Appointment", bis: "Pag-set og Appointment" },
  nextButton: { en: "Next", tl: "Susunod", bis: "Sunod" },
  backButton: { en: "Back", tl: "Bumalik", bis: "Balik" },

  // Checklist step — common
  eligibility: { en: "Eligibility", tl: "Kwalipikasyon", bis: "Kwalipikasyon" },
  yes: { en: "Yes", tl: "Oo", bis: "Oo" },
  no: { en: "No", tl: "Hindi", bis: "Dili" },
  otherOption: { en: "Others", tl: "Iba pa", bis: "Lain pa" },
  sameAsApplicantAddress: { en: "Same as applicant's address", tl: "Katulad ng Address ng Applicant", bis: "Pareho sa Address sa Applicant" },

  // Checklist — educational
  eduEligResident: { en: "Resident of Quezon City, and a duly registered Child with Disability (with QC ID)", tl: "Residente ng Quezon City, at duly registered na Children with Disability (may QC ID)", bis: "Residente sa Quezon City, ug duly registered nga Child with Disability (naa'y QC ID)" },
  eduEligAge: { en: "6-30 years old", tl: "Edad 6-30 taong gulang", bis: "Edad 6-30 ka tuig" },
  eduEligSchool: { en: "Enrolled in a Public School (SPED up to Grade 10)", tl: "Nakatala sa Public School (SPED hanggang Grade 10)", bis: "Naka-enrol sa Public School (SPED hangtod Grade 10)" },
  eduEligIndigent: { en: "Part of an indigent family with income of 13,873 and below", tl: "Kabilang sa indigent family na may income na 13,873 at pababa", bis: "Kabahin sa indigent family nga may income nga 13,873 og ubos" },

  // Checklist — funeral
  deceasedResidentQuestion: { en: "Was the deceased a resident of QC?", tl: "Ang namatay ba ay residente ng QC?", bis: "Ang namatay ba residente sa QC?" },
  relationToDeceasedQuestion: { en: "What is your relation to the deceased?", tl: "Ano ang relasyon mo sa yumao?", bis: "Unsa imong relasyon sa namatay?" },
  relationChild: { en: "Child", tl: "Anak", bis: "Anak" },
  relationParent: { en: "Parent", tl: "Magulang", bis: "Ginikanan" },
  relationSibling: { en: "Sibling", tl: "Kapatid", bis: "Igsoon" },
  relationSpouse: { en: "Spouse", tl: "Asawa", bis: "Asawa" },
  funeralHomeQuestion: { en: "If you already have a funeral home, select which funeral home provided the service", tl: "Kung mayroon nang nakuhang punerarya, pumili kung anong funeral ang nagserbisyo", bis: "Kung naa nay punerarya, pilia kung unsang funeral ang nag-serbisyo" },
  chooseFuneralHome: { en: "Choose a funeral home", tl: "Pumili ng funeral home", bis: "Pagpili og funeral home" },
  funeralHomeHint: { en: "Please choose an accredited partner funeral home. If your chosen funeral home is not listed, select 'Others'.", tl: "Pumili po ng isang akreditadong partner na punerarya. Kung hindi nakalista ang inyong napiling punerarya, piliin ang 'Iba pa'.", bis: "Palihug pilia ang usa ka akreditado nga partner nga punerarya. Kung wala nakalista ang inyong gipili nga punerarya, pilia ang 'Lain pa'." },

  // Checklist — medical (default)
  medicalRequirementsTitle: { en: "Service and primary requirements", tl: "Mga Kinakailangan sa Serbisyo at sa Pangunahing Kinakailangan", bis: "Mga Kinahanglanon sa Serbisyo ug Panguna nga Kinahanglanon" },
  qcResidentQuestion: { en: "Are you a legitimate resident of Quezon City?", tl: "Ikaw ba ay isang lehitimong residente ng Quezon City?", bis: "Ikaw ba usa ka lehitimong residente sa Quezon City?" },
  qcPatientQuestion: { en: "Are you a QC citizen (or family member) with an illness who needs financial assistance for hospitalization/medicine?", tl: "Ikaw ba ay isang QC citizen (o miyembro ng pamilya) na may karamdaman na nangangailangan ng tulong pinansyal para sa ospitalisasyon/gamot?", bis: "Ikaw ba usa ka QC citizen (o membro sa pamilya) nga may sakit nga nagkinahanglan og tabang pinansyal para sa ospitalisasyon/tambal?" },
  priorAidQuestion: { en: "Have you already received medical assistance from another Quezon City office?", tl: "Nakakuha ka na ba ng tulong medikal mula sa ibang opisina ng Quezon City?", bis: "Nakadawat na ba ka og tabang medikal gikan sa laing opisina sa Quezon City?" },
  priorAidYes: { en: "Yes, I already received medical assistance", tl: "Oo, nakakuha na ako ng tulong medikal", bis: "Oo, nakadawat na ko og tabang medikal" },
  priorAidNo: { en: "Not yet", tl: "Hindi pa", bis: "Wala pa" },
  priorAidOfficeLabel: { en: "If yes, specify the office", tl: "Kung oo, tukuyin ang opisina", bis: "Kung oo, isulti ang opisina" },
  priorAidOfficePlaceholder: { en: "e.g., QC Health Department, QC Social Services, etc.", tl: "hal., QC Health Department, QC Social Services, atbp.", bis: "pananglitan, QC Health Department, QC Social Services, ug uban pa." },
  priorAidTypeLabel: { en: "Type of assistance received", tl: "Uri ng tulong na natanggap", bis: "Matang sa tabang nga nadawat" },
  priorAidCash: { en: "Cash", tl: "Cash", bis: "Cash" },
  priorAidGuaranteeLetter: { en: "Guarantee Letter", tl: "Guarantee Letter", bis: "Guarantee Letter" },
  priorAidMedicine: { en: "Medicine", tl: "Gamot", bis: "Tambal" },
  clickAssistanceType: { en: "Click the type of assistance", tl: "I-click ang Type ng Assistance", bis: "I-click ang Type sa Assistance" },
  chooseAssistanceType: { en: "Choose the type of assistance", tl: "Pumili ng Type ng Assistance", bis: "Pilia ang Type sa Assistance" },
  medicinesMedicalSupplies: { en: "Medicines / Medical Supplies", tl: "Medicines / Medical Supplies", bis: "Medicines / Medical Supplies" },

  // Pending Screen / Block Screen & Submission Status
  hasPendingAppTitle: { en: "You Have an Active Application", tl: "May Kasalukuyang Application Ka Pa", bis: "Naa kay Kasamtangang Aplikasyon" },
  hasPendingAppDesc: {
    en: "Your application for {type} has been successfully submitted and is currently pending review. Please wait for a Social Worker's assessment before submitting a new application.",
    tl: "Matagumpay na naisumite at nakabinbin (Pending) na ang inyong aplikasyon para sa {type}. Maghintay muna ng pagsusuri ng Social Worker bago magsumite ng panibagong aplikasyon.",
    bis: "Malampusong nasumite ug naghulat (Pending) na ang imong aplikasyon alang sa {type}. Palihug paghulat og pagsusi gikan sa Social Worker una magsumite og bag-ong aplikasyon.",
  },
  appRefNoLabel: { en: "Application Reference No.:", tl: "Application Reference No.:", bis: "Application Reference No.:" },
  appStatusLabel: { en: "Status:", tl: "Katayuan (Status):", bis: "Kahimtang (Status):" },
  statusPendingBadge: { en: "● Under Review (Pending)", tl: "● Kasalukuyang Sinusuri (Pending)", bis: "● Kasamtangang Gisusi (Pending)" },
  dateFiledLabel: { en: "Date Filed:", tl: "Petsa ng Pagsumite:", bis: "Petsa sa Pagsumite:" },
  viewMyApplications: { en: "VIEW IN MY APPLICATIONS", tl: "TINGNAN SA MY APPLICATIONS", bis: "TAN-AWA SA AKONG MGA APLIKASYON" },
  recentlySubmitted: { en: "Recently", tl: "Kamakailan", bis: "Bag-o lang" },
  checkingEligibility: { en: "Checking your eligibility...", tl: "Sinusuri ang iyong eligibility...", bis: "Gisusi ang imong kwalipikasyon..." },
  requirementsForAppOf: { en: "Requirements for Application of QC {type}", tl: "Mga Kinakailangan sa Pag-apply ng QC {type}", bis: "Mga Kinahanglanon sa Pag-apply sa QC {type}" },
  officialServiceNote: { en: "Official service for QC AICS Crisis Assistance.", tl: "Opisyal na serbisyo para sa AICS Crisis Assistance ng Lungsod Quezon.", bis: "Opisyal nga serbisyo para sa AICS Crisis Assistance sa Dakbayan sa Quezon." },
  viewRequirements: { en: "View Requirements", tl: "Tingnan ang Requirements", bis: "Tan-awa ang mga Kinahanglanon" },
  primaryReqAlertTitle: { en: "{type} — PRIMARY REQUIREMENTS", tl: "{type} — MGA PANGUNAHING KINAKAILANGAN", bis: "{type} — NAG-UNANG MGA KINAHANGLANON" },
  primaryReqAlertDesc: { en: "Complete the primary qualification questions below and prepare the required documents to proceed with your application.", tl: "Kumpletuhin ang mga pangunahing kwalipikasyon at ihanda ang mga kaukulang dokumento upang makapagpatuloy sa aplikasyon.", bis: "Kompletoha ang mga nag-unang kwalipikasyon ug iandam ang mga gikinahanglang dokumento aron makapadayon sa aplikasyon." },
  seniorBookletAlertTitle: { en: "{title} — PRIMARY REQUIREMENTS", tl: "{title} — MGA PANGUNAHING KINAKAILANGAN", bis: "{title} — NAG-UNANG MGA KINAHANGLANON" },
  seniorBookletAlertDesc: { en: "Complete the primary qualifications and prepare your Senior Citizen / OSCA ID to apply.", tl: "Kumpletuhin ang mga pangunahing kwalipikasyon at ihanda ang inyong Senior Citizen / OSCA ID upang makapag-apply.", bis: "Kompletoha ang mga nag-unang kwalipikasyon ug iandam ang imong Senior Citizen / OSCA ID aron maka-apply." },
  submittingApplication: { en: "Submitting Application...", tl: "Isinusumite ang Aplikasyon...", bis: "Ginasumite ang Aplikasyon..." },
  pleaseWaitProcessing: { en: "Please wait while your application is being processed.", tl: "Mangyaring maghintay habang pinoproseso ang inyong aplikasyon.", bis: "Palihug paghulat samtang giproseso ang imong aplikasyon." },
  applicationSubmittedBadge: { en: "Application Submitted Successfully!", tl: "Matagumpay na Naisumite ang Aplikasyon!", bis: "Malampusong Nasumite ang Aplikasyon!" },
  submittedWelcomeTitle: { en: "Welcome! Your Application Has Been Received", tl: "Mabuhay! Ang inyong aplikasyon ay Natanggap Na", bis: "Maayong Pag-abot! Nadawat Na ang Imong Aplikasyon" },
  submittedSubtitle: {
    en: "Your {type} application has been submitted successfully and is currently under review.",
    tl: "Ang inyong {type} application ay matagumpay na naisumite at kasalukuyang sinusuri.",
    bis: "Ang imong {type} nga aplikasyon malampusong nasumite ug kasamtangang gisusi.",
  },
  serviceLabel: { en: "Service:", tl: "Serbisyo:", bis: "Serbisyo:" },
  applicantLabel: { en: "Applicant:", tl: "Aplikante:", bis: "Aplikante:" },
  dateLabel: { en: "Date:", tl: "Petsa:", bis: "Petsa:" },
  notifCheckNote: {
    en: "You may check Notifications for updates regarding your application status.",
    tl: "Maaari ninyong tingnan ang Notifications para sa mga update sa inyong aplikasyon.",
    bis: "Mahimo nimong tan-awon ang mga Pahibalo para sa mga update sa imong aplikasyon.",
  },
  autoRedirectStatusCountdown: {
    en: "Automatically redirecting to application status in {count} seconds...",
    tl: "Awtomatikong lilipat sa application status sa loob ng {count} segundo...",
    bis: "Awtomatikong mobalhin sa status sa aplikasyon sulod sa {count} segundos...",
  },

  // Personal information step
  importantReminder: { en: "Important reminder", tl: "Mahalagang Paalala", bis: "Importanteng Pahinumdom" },
  qcidReminderNote: {
    en: "Please make sure the information on your QCID is correct and complete. If any detail is missing or incorrect, contact the QCID Team to update your QCID records before continuing your application. Accurate information is important for fast and smooth processing of your service.",
    tl: "Mangyaring tiyakin na ang impormasyong nakalagay sa iyong QCID ay tama at kumpleto. Kung may kulang o maling detalye, makipag-ugnayan sa QCID Team upang ma-update ang iyong QCID records bago magpatuloy sa aplikasyon. Ang tamang impormasyon ay mahalaga para sa mabilis at maayos na pagproseso ng iyong serbisyo.",
    bis: "Palihug siguroha nga husto ug kumpleto ang impormasyon sa imong QCID. Kung naay kulang o sayop nga detalye, kontaka ang QCID Team para i-update ang imong QCID records sa dili pa magpadayon sa aplikasyon. Importante ang husto nga impormasyon para sa paspas ug maayo nga pagproseso sa imong serbisyo.",
  },
  qcIdLabel: { en: "QC ID", tl: "QC ID", bis: "QC ID" },
  firstNameLabel: { en: "First name", tl: "Pangalan", bis: "Ngalan" },
  middleNameLabel: { en: "Middle name", tl: "Gitnang Pangalan (middle name)", bis: "Tunga nga Ngalan (middle name)" },
  lastNameLabel: { en: "Last name", tl: "Apelyido", bis: "Apelyido" },
  suffixLabel: { en: "Suffix (Jr., Sr., III, etc.)", tl: "Suffix (Jr., Sr., III, atbp.)", bis: "Suffix (Jr., Sr., III, ug uban pa)" },
  nationalityLabel: { en: "Nationality", tl: "Nasyonalidad", bis: "Nasyonalidad" },
  birthDateLabel: { en: "Date of birth", tl: "Petsa ng Kapanganakan", bis: "Petsa sa Pagkatawo" },
  ageLabel: { en: "Age", tl: "Edad", bis: "Edad" },
  genderLabel: { en: "Gender", tl: "Kasarian", bis: "Kasarian" },
  pleaseChoose: { en: "Please choose", tl: "Piliin", bis: "Pagpili" },
  genderMale: { en: "Male", tl: "Lalaki", bis: "Lalaki" },
  genderFemale: { en: "Female", tl: "Babae", bis: "Babae" },
  civilStatusLabel: { en: "Civil status", tl: "Katayuang Sibil", bis: "Kahimtang Sibil" },
  civilStatusSingle: { en: "Single", tl: "Single", bis: "Single" },
  civilStatusMarried: { en: "Married", tl: "Married", bis: "Married" },
  civilStatusWidowed: { en: "Widowed", tl: "Widowed", bis: "Widowed" },
  civilStatusSeparated: { en: "Separated", tl: "Separated", bis: "Separated" },
  houseNumberLabel: { en: "House/Building number", tl: "Numero ng Bahay/Gusali", bis: "Numero sa Balay/Gusali" },
  streetNameLabel: { en: "Street name", tl: "Pangalan ng Kalye", bis: "Ngalan sa Dalan" },
  barangayLabel: { en: "Barangay", tl: "Barangay", bis: "Barangay" },
  phoneNumberLabel: { en: "Phone number", tl: "Numero ng Telepono", bis: "Numero sa Telepono" },
  emailLabel: { en: "Email", tl: "Email", bis: "Email" },
  selfPatientCheckbox: { en: "I am the patient applying for myself", tl: "Ako ang pasyente na nag-a-apply para sa sarili ko", bis: "Ako ang pasyente nga nag-apply para sa akong kaugalingon" },

  // Deceased info (funeral)
  deceasedInfoHeader: { en: "Deceased information", tl: "Impormasyon ng Namatay", bis: "Impormasyon sa Namatay" },
  deathDateLabel: { en: "Date of death", tl: "Petsa ng Kamatayan", bis: "Petsa sa Kamatayon" },
  ageAutoFilled: { en: "Automatically computed", tl: "Awtomatikong makukuha", bis: "Awtomatikong makuha" },
  cremationOrBurialLabel: { en: "Cremation or burial", tl: "Cremation or Burial", bis: "Cremation or Burial" },
  cremationOption: { en: "Cremation", tl: "Cremation", bis: "Cremation" },
  burialOption: { en: "Burial", tl: "Burial", bis: "Burial" },
  cremationPlaceLabel: { en: "Where will it be cremated", tl: "Saan Ikri-Cremate", bis: "Asa I-cremate" },
  selectCremation: { en: "Select cremation site...", tl: "Select Cremation...", bis: "Select Cremation..." },
  baesaCrematorium: { en: "Baesa Crematorium", tl: "Baesa Crematorium", bis: "Baesa Crematorium" },
  othersSpecify: { en: "Others (Specify)", tl: "Others (Specify)", bis: "Lain pa (Isulti)" },
  cremationPlaceOtherLabel: { en: "Specify the cremation location", tl: "Tukuyin ang Lugar ng Cremation", bis: "Isulti ang Lugar sa Cremation" },
  cremationPlaceOtherPlaceholder: { en: "Name of crematorium/place", tl: "Pangalan ng crematorium/lugar", bis: "Ngalan sa crematorium/lugar" },
  burialPlaceLabel: { en: "Where will it be buried", tl: "Saan Ililibing", bis: "Asa Ilubong" },
  selectBurial: { en: "Select burial site...", tl: "Select Burial...", bis: "Select Burial..." },
  bagbagCemetery: { en: "Bagbag Public Cemetery", tl: "Bagbag Public Cemetery", bis: "Bagbag Public Cemetery" },
  novalichesCemetery: { en: "Novaliches Public Cemetery", tl: "Novaliches Public Cemetery", bis: "Novaliches Public Cemetery" },
  burialPlaceOtherLabel: { en: "Specify the burial location", tl: "Tukuyin ang Lugar ng Libing", bis: "Isulti ang Lugar sa Lubong" },
  burialPlaceOtherPlaceholder: { en: "Name of cemetery/place", tl: "Pangalan ng sementeryo/lugar", bis: "Ngalan sa sementeryo/lugar" },
  placeOfDeathLabel: { en: "Place of death", tl: "Lugar ng Kamatayan", bis: "Lugar sa Kamatayon" },
  burialDateLabel: { en: "Date of burial", tl: "Petsa ng Libing", bis: "Petsa sa Lubong" },

  // Beneficiary info (educational)
  relationToBeneficiaryLabel: { en: "Relation to beneficiary", tl: "Relasyon sa Benepisyaryo", bis: "Relasyon sa Benepisyaryo" },
  relationParentType: { en: "Parent", tl: "Magulang", bis: "Ginikanan" },
  relationGuardian: { en: "Guardian", tl: "Tagapag-alaga (Guardian)", bis: "Tigbantay (Guardian)" },
  relationSiblingType: { en: "Sibling", tl: "Kapatid", bis: "Igsoon" },
  relationSelf: { en: "Self", tl: "Sarili", bis: "Kaugalingon" },
  beneficiaryInfoHeader: { en: "Beneficiary information", tl: "Impormasyon ng Benepisyaryo", bis: "Impormasyon sa Benepisyaryo" },
  selfBeneficiaryCheckbox: { en: "I am the beneficiary applying for myself", tl: "Ako ang benepisyaryo na nag-a-apply para sa sarili ko", bis: "Ako ang benepisyaryo nga nag-apply para sa akong kaugalingon" },
  beneficiaryFirstNameLabel: { en: "Beneficiary's first name", tl: "Pangalan ng Benepisyaryo", bis: "Ngalan sa Benepisyaryo" },
  beneficiaryMiddleNameLabel: { en: "Beneficiary's middle name", tl: "Gitnang Pangalan ng Benepisyaryo (middle name)", bis: "Tunga nga Ngalan sa Benepisyaryo (middle name)" },
  beneficiaryLastNameLabel: { en: "Beneficiary's last name", tl: "Apelyido ng Benepisyaryo", bis: "Apelyido sa Benepisyaryo" },
  beneficiarySuffixLabel: { en: "Beneficiary's suffix (Jr., Sr., III, etc.)", tl: "Suffix ng Benepisyaryo (Jr., Sr., III, atbp.)", bis: "Suffix sa Benepisyaryo (Jr., Sr., III, ug uban pa)" },
  beneficiaryBirthDateLabel: { en: "Beneficiary's date of birth", tl: "Petsa ng Kapanganakan ng Benepisyaryo", bis: "Petsa sa Pagkatawo sa Benepisyaryo" },
  beneficiaryAgeLabel: { en: "Beneficiary's age", tl: "Edad ng Benepisyaryo", bis: "Edad sa Benepisyaryo" },
  beneficiaryGenderLabel: { en: "Beneficiary's gender", tl: "Kasarian ng Benepisyaryo", bis: "Kasarian sa Benepisyaryo" },
  disabilityTypeLabel: { en: "Type of Disability", tl: "Uri ng Kapansanan", bis: "Matang sa Kapansanan" },
  disabilityVisual: { en: "Visual Impairment", tl: "Visual Impairment", bis: "Visual Impairment" },
  disabilityHearing: { en: "Hearing Impairment", tl: "Hearing Impairment", bis: "Hearing Impairment" },
  disabilityPhysical: { en: "Physical/Orthopedic Disability", tl: "Physical/Orthopedic Disability", bis: "Physical/Orthopedic Disability" },
  disabilityIntellectual: { en: "Intellectual Disability", tl: "Intellectual Disability", bis: "Intellectual Disability" },
  disabilityAutism: { en: "Autism Spectrum Disorder", tl: "Autism Spectrum Disorder", bis: "Autism Spectrum Disorder" },
  disabilityLearning: { en: "Learning Disability", tl: "Learning Disability", bis: "Learning Disability" },
  schoolNameLabel: { en: "School name", tl: "Pangalan ng Paaralan", bis: "Ngalan sa Eskwelahan" },
  schoolAddressLabel: { en: "School address", tl: "Address ng Paaralan", bis: "Address sa Eskwelahan" },
  gradeLevelLabel: { en: "Grade level (indicate if NON-GRADED)", tl: "Antas ng Grado (ipahiwatig kung NON-GRADED)", bis: "Grade Level (isulti kung NON-GRADED)" },
  beneficiaryHouseNumberLabel: { en: "Beneficiary's house/building number", tl: "Numero ng Bahay/Gusali ng Benepisyaryo", bis: "Numero sa Balay/Gusali sa Benepisyaryo" },
  beneficiaryStreetNameLabel: { en: "Beneficiary's street name", tl: "Pangalan ng Kalye ng Benepisyaryo", bis: "Ngalan sa Dalan sa Benepisyaryo" },
  beneficiaryBarangayLabel: { en: "Beneficiary's barangay", tl: "Barangay ng Benepisyaryo", bis: "Barangay sa Benepisyaryo" },

  // Informant info (medical)
  informantInfoHeader: { en: "Informant information", tl: "Impormasyon ng Informant", bis: "Impormasyon sa Informant" },

  // Documents step
  fileUploadHeader: { en: "File upload", tl: "Pag-upload ng File", bis: "Pag-upload sa File" },
  fileUploadDesc1: {
    en: "Make sure to upload the appropriate documents for each category and verify that all details—such as your full name (first, middle, and last name) and address—match the information on your QC ID.",
    tl: "Tiyakin na i-upload ang mga naaangkop na dokumento para sa bawat kategorya at i-verify na ang lahat ng detalye—tulad ng iyong buong pangalan (una, gitna, at huling pangalan) at address—ay tumutugma sa impormasyon sa iyong QC ID.",
    bis: "Siguroha nga na-upload ang angay nga mga dokumento para sa matag kategorya ug i-verify nga ang tanang detalye—sama sa imong tibuok ngalan (una, tunga, ug ulahi nga ngalan) ug address—motugma sa impormasyon sa imong QC ID.",
  },
  fileUploadDesc2: {
    en: "Click the \"Sample Document\" button above each file upload to see a sample file and make sure your upload matches the required format.",
    tl: "I-click ang \"Sample Document\" button sa itaas ng bawat file upload para makita ang sample file at matiyak na ang iyong upload ay tumutugma sa kinakailangang format.",
    bis: "I-click ang \"Sample Document\" button sa ibabaw sa matag file upload para makita ang sample file ug siguroha nga ang imong upload motugma sa gikinahanglan nga format.",
  },
  sampleDocument: { en: "Sample document", tl: "Sample Document", bis: "Sample Document" },
  allowedFileTypes: { en: "Allowed file types", tl: "Allowed file types", bis: "Allowed nga file types" },
  uploadFiles: { en: "Upload file(s)", tl: "Upload File(s)", bis: "Upload File(s)" },
  removeFile: { en: "Remove {filename}", tl: "Alisin ang {filename}", bis: "Tangtanga ang {filename}" },
  sampleLabel: { en: "Sample: {name}", tl: "Sample: {name}", bis: "Sample: {name}" },
  download: { en: "Download", tl: "Download", bis: "Download" },
  noFileUploadedYet: { en: "No file uploaded yet.", tl: "Wala pang na-upload na file.", bis: "Wala pa nay na-upload nga file." },
  noSampleImageAvailable: { en: "No sample image available.", tl: "Walang sample image na available.", bis: "Walay sample image nga available." },

  // Review step
  burialAssistanceHeading: { en: "Burial Assistance", tl: "Burial Assistance", bis: "Burial Assistance" },
  reviewApplicationHeader: { en: "Review your application", tl: "Suriin ang Iyong Application", bis: "Susiha ang Imong Application" },
  reviewApplicationDesc: {
    en: "Please review all information carefully before submitting your application. You can edit any section by clicking the edit button.",
    tl: "Mangyaring suriin nang mabuti ang lahat ng impormasyon bago i-submit ang iyong application. Maaari mong i-edit ang anumang seksyon sa pamamagitan ng pag-click sa edit button.",
    bis: "Palihug susiha pag-ayo ang tanang impormasyon sa dili pa i-submit ang imong application. Mahimo nimong i-edit ang bisan unsang seksyon pinaagi sa pag-click sa edit button.",
  },
  requirementsSectionTitle: { en: "Requirements", tl: "Mga Kinakailangan", bis: "Mga Kinahanglanon" },
  personalInfoSectionTitle: { en: "Personal information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  documentsSectionTitle: { en: "Required documents", tl: "Mga Kinakailangang Dokumento", bis: "Mga Gikinahanglan nga Dokumento" },
  editButton: { en: "Edit", tl: "I-edit", bis: "I-edit" },
  deceasedResidentCheckLabel: { en: "The deceased was a resident of Quezon City", tl: "Ang namatay ay residente ng Quezon City", bis: "Ang namatay residente sa Quezon City" },
  informantRelativeCheckLabel: { en: "The informant is a close relative of the deceased", tl: "Ang informant ay malapit na kamag-anak ng namatay", bis: "Ang informant duol nga paryente sa namatay" },
  priorAidTypeCheckLabel: { en: "Type of assistance received:", tl: "Uri ng tulong na natanggap:", bis: "Matang sa tabang nga nadawat:" },
  assistanceTypeCheckLabel: { en: "Type of assistance: Medicines / Medical Supplies", tl: "Type ng Assistance: Medicines / Medical Supplies", bis: "Type sa Assistance: Medicines / Medical Supplies" },
  submitConfirmNote: {
    en: "By clicking \"Submit\", you confirm that all information provided is true and complete. Your application will be reviewed by an evaluator, and you will receive a notification to your email about the status of your application.",
    tl: "Sa pag-click ng \"Submit\", kinukumpirma mo na ang lahat ng impormasyong ibinigay ay tama at kumpleto. Ang iyong application ay susuriin ng isang evaluator, at makakatanggap ka ng notification sa iyong email tungkol sa status ng iyong application.",
    bis: "Sa pag-click sa \"Submit\", gikumpirma nimo nga husto ug kumpleto ang tanang impormasyon nga gihatag. Ang imong application susihon sa usa ka evaluator, ug makadawat ka og notification sa imong email bahin sa status sa imong application.",
  },
  qcIdNumberLabel: { en: "QC ID number", tl: "QC ID Number", bis: "QC ID Number" },
  fullNameLabel: { en: "Full name", tl: "Buong Pangalan", bis: "Tibuok Ngalan" },
  completeAddressLabel: { en: "Complete address", tl: "Kumpletong Address", bis: "Kompleto nga Address" },
  submitButton: { en: "Submit", tl: "Submit", bis: "Submit" },

  // Appointment step
  requestAppointmentHeader: { en: "Request an appointment", tl: "Hiling ng Appointment", bis: "Hangyo og Appointment" },
  requestAppointmentDesc: {
    en: "The date and time of your appointment will be set by a social worker after reviewing your application. You don't need to choose a schedule — you'll receive a notification once it has been set.",
    tl: "Ang petsa at oras ng iyong appointment ay itatakda ng isang social worker matapos suriin ang iyong application. Hindi ka na kailangang pumili ng schedule — makakatanggap ka ng notification kapag na-set na ito.",
    bis: "Ang petsa ug oras sa imong appointment i-set sa usa ka social worker human masusi ang imong application. Dili na nimo kinahanglan mopili og schedule — makadawat ka og notification kung na-set na kini.",
  },
  confirmSubmitNote: {
    en: "By clicking \"Confirm & Submit\", your appointment request will be sent to the SSDD office. Your appointment schedule will appear on your application status once confirmed by the social worker.",
    tl: "Sa pag-click ng \"CONFIRM & SUBMIT\", ipapadala ang iyong hiling ng appointment sa SSDD office. Ang iyong appointment schedule ay lalabas sa status ng iyong application kapag na-confirm na ng social worker.",
    bis: "Sa pag-click sa \"CONFIRM & SUBMIT\", ipadala ang imong hangyo sa appointment sa SSDD office. Ang imong appointment schedule motungha sa status sa imong application kung na-confirm na sa social worker.",
  },
  confirmAndSubmit: { en: "Confirm & submit", tl: "Confirm & Submit", bis: "Confirm & Submit" },

  submittingApplicationDesc: { en: "This will only take a moment...", tl: "Sandali lang po...", bis: "Sandali ra po..." },
  waitingApprovalHeader: { en: "Waiting for admin approval", tl: "Naghihintay ng Pag-apruba", bis: "Naghulat og Pag-apruba" },
  waitingApprovalMsg: {
    en: "Thank you, {name}. Your {type} request has been received and is now waiting for approval by a social worker.",
    tl: "Salamat, {name}. Natanggap na ang kahilingan mong {type} at hinihintay na ngayon ang pag-apruba ng social worker.",
    bis: "Salamat, {name}. Nadawat na ang imong hangyo nga {type} ug naghulat na karon sa pag-apruba sa social worker.",
  },
  appointmentScheduleLabel: { en: "Appointment schedule", tl: "Appointment schedule", bis: "Appointment schedule" },
  appointmentPendingNote: { en: "Pending — to be set by the social worker", tl: "Hihintayin — itatakda ng social worker", bis: "Hulaton — i-set sa social worker" },

  // ─────────────────────────────────────────────
  // PWD Application Wizard (PWDApplicationWizard.tsx)
  // ─────────────────────────────────────────────
  pwdStepChecklist: { en: "Complete checklist", tl: "Kumpletuhin ang Checklist", bis: "Kumpletoha ang Checklist" },
  pwdStepPersonal: { en: "Personal information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  pwdStepDocuments: { en: "Sample documents", tl: "Mga Sample na Dokumento", bis: "Mga Sample nga Dokumento" },
  pwdStepReview: { en: "Review & submit", tl: "Suriin at Isumite", bis: "Susiha ug Isumite" },
  pwdStepAppointment: { en: "Set an appointment", tl: "Mag-set ng Appointment", bis: "Pag-set og Appointment" },

  pwdChecklistHeader: { en: "Service and primary requirements", tl: "Mga Kinakailangan sa Serbisyo at sa Pangunahing Kinakailangan", bis: "Mga Kinahanglanon sa Serbisyo ug Panguna nga Kinahanglanon" },
  pwdResidentQuestion: { en: "Are you a legitimate resident of Quezon City?", tl: "Ikaw ba ay isang lehitimong residente ng Quezon City?", bis: "Ikaw ba usa ka lehitimong residente sa Quezon City?" },
  pwdHasDisabilityQuestion: { en: "Do you have a disability that needs a PWD ID?", tl: "Ikaw ba ay may kapansanan na nangangailangan ng PWD ID?", bis: "Ikaw ba may kapansanon nga nagkinahanglan og PWD ID?" },
  pwdCheckboxRequiredNote: { en: "You need to check this to continue.", tl: "Kailangan i-check ito para magpatuloy.", bis: "Kinahanglan i-check kini para magpadayon." },
  pwdIdStatusQuestion: { en: "Do you already have a PWD ID Number?", tl: "Mayroon ka na bang PWD ID Number?", bis: "Naa ka na bay PWD ID Number?" },
  pwdRenewalOption: { en: "Yes, this is a RENEWAL", tl: "Oo, ito ay RENEWAL", bis: "Oo, kini RENEWAL" },
  pwdNewApplicationOption: { en: "Not yet, NEW APPLICATION", tl: "Wala pa, BAGONG APLIKASYON", bis: "Wala pa, BAG-ONG APLIKASYON" },
  pwdChooseOneNote: { en: "You need to choose one.", tl: "Kailangan pumili ng isa.", bis: "Kinahanglan mopili og usa." },
  pwdRenewalNote: { en: "RENEWAL: Updating your existing PWD ID. Prepare your current ID number.", tl: "RENEWAL: Ina-update ang iyong kasalukuyang PWD ID. Ihanda ang iyong kasalukuyang ID number.", bis: "RENEWAL: Gi-update ang imong naa nang PWD ID. Andama ang imong karon nga ID number." },
  pwdNewApplicationNote: { en: "NEW APPLICATION: First-time PWD ID application. Complete all requirements.", tl: "BAGONG APLIKASYON: Unang beses na PWD ID application. Kumpletuhin ang lahat ng kinakailangan.", bis: "BAG-ONG APLIKASYON: Unang higayon nga PWD ID application. Kompletoha ang tanang kinahanglanon." },
  pwdDisabilityTypeHeader: { en: "Click the type of disability", tl: "I-click ang Uri ng Kapansanan", bis: "I-click ang Matang sa Kapansanon" },
  pwdChooseDisabilityType: { en: "Choose the type of disability", tl: "Pumili ng Type of Disability", bis: "Pagpili og Type sa Disability" },
  pwdSelectDisabilityType: { en: "Select the type of disability", tl: "Piliin ang uri ng kapansanan", bis: "Pilia ang matang sa kapansanon" },
  pwdDisabilityTypeRequiredNote: { en: "You need to select a type of disability.", tl: "Kailangan pumili ng uri ng kapansanan.", bis: "Kinahanglan mopili og matang sa kapansanon." },

  pwdApplicantInfoHeader: { en: "Applicant information", tl: "Impormasyon ng Aplikante", bis: "Impormasyon sa Aplikante" },
  pwdFamilyApplyCheckbox: { en: "I am applying for my family member (e.g. sibling), not for myself", tl: "Nag-a-apply ako para sa aking kapamilya (hal. kapatid), hindi para sa sarili ko", bis: "Nag-apply ko para sa akong pamilya (pananglitan, igsoon), dili para sa akong kaugalingon" },
  pwdFamilyRenewCheckbox: { en: "I am renewing a PWD ID for my family member, not for myself.", tl: "Nagre-renew ako ng PWD ID para sa aking kapamilya, hindi para sa sarili ko.", bis: "Nag-renew ko og PWD ID para sa akong pamilya, dili para sa akong kaugalingon." },
  pwdFamilyReplaceCheckbox: { en: "I am replacing a PWD ID for my family member, not for myself.", tl: "Nagpapalit ako ng PWD ID para sa aking kapamilya, hindi para sa sarili ko.", bis: "Nag-ilis ko og PWD ID para sa akong pamilya, dili para sa akong kaugalingon." },
  pwdQcidNoLabel: { en: "QCID No.", tl: "QCID No.", bis: "QCID No." },
  pwdSuffixLabel: { en: "Suffix", tl: "Suffix", bis: "Suffix" },
  pwdDobLabel: { en: "Date of birth", tl: "Petsa ng Kapanganakan", bis: "Petsa sa Pagkatawo" },
  pwdPobCityLabel: { en: "Place of birth (City/Town)", tl: "Lugar ng Kapanganakan (Lungsod/Bayan)", bis: "Dapit sa Pagkatawo (Lungsod/Bayan)" },
  pwdPobProvinceLabel: { en: "Place of birth (Province)", tl: "Lugar ng Kapanganakan (Probinsya)", bis: "Dapit sa Pagkatawo (Probinsya)" },
  pwdCitizenshipLabel: { en: "Citizenship", tl: "Nasyonalidad", bis: "Nasyonalidad" },
  pwdSpecifyLabel: { en: "Specify", tl: "Tukuyin", bis: "Isulti" },
  pwdSexLabel: { en: "Sex", tl: "Kasarian", bis: "Sekso" },
  pwdBloodTypeLabel: { en: "Blood type", tl: "Uri ng Dugo", bis: "Matang sa Dugo" },
  pwdOccupationLabel: { en: "Occupation", tl: "Trabaho", bis: "Trabaho" },
  pwdReligionLabel: { en: "Religion", tl: "Relihiyon", bis: "Relihiyon" },
  pwdSpecifyReligionLabel: { en: "Specify religion", tl: "Tukuyin ang Relihiyon", bis: "Isulti ang Relihiyon" },
  pwdContactNoLabel: { en: "Contact no.", tl: "Numero ng Contact", bis: "Numero sa Kontak" },

  pwdFamilyInfoHeader: { en: "Family member information (PWD applicant)", tl: "Impormasyon ng Kapamilya (PWD Applicant)", bis: "Impormasyon sa Pamilya (PWD Applicant)" },
  pwdFamilyInfoNote: {
    en: "This is the information of the family member (e.g. sibling) who is the PWD applicant. The account information above stays the same.",
    tl: "Ito ang impormasyon ng kapamilya (hal. kapatid) na PWD applicant. Mananatili ang info ng account sa itaas.",
    bis: "Kini ang impormasyon sa pamilya (pananglitan, igsoon) nga PWD applicant. Magpabilin ang info sa account sa taas.",
  },
  pwdFamilyAddressLabel: { en: "Family member's address", tl: "Address ng Kapamilya", bis: "Address sa Pamilya" },
  pwdFamilyDisabilityLabel: { en: "Family member's disability", tl: "Kapansanan ng Kapamilya", bis: "Kapansanon sa Pamilya" },

  pwdAddressHeader: { en: "Address", tl: "Address", bis: "Address" },
  pwdCityProvinceLabel: { en: "City / Province", tl: "City / Province", bis: "City / Province" },
  pwdPermanentAddressLabel: { en: "Permanent address", tl: "Permanenteng Address", bis: "Permanente nga Address" },
  pwdPresentAddressLabel: { en: "Present address", tl: "Kasalukuyang Address", bis: "Karon nga Address" },

  pwdFamilyBackgroundHeader: { en: "Family background", tl: "Kasaysayan ng Pamilya", bis: "Kasaysayan sa Pamilya" },
  pwdMotherMaidenNameLabel: { en: "Mother's maiden name", tl: "Pangalan ng Ina bago Ikasal", bis: "Ngalan sa Inahan sa Wala pa Maminyo" },
  pwdFatherNameLabel: { en: "Father's name", tl: "Pangalan ng Ama", bis: "Ngalan sa Amahan" },

  pwdEmergencyCaregiverHeader: { en: "Emergency & caregiver contact", tl: "Emergency at Caregiver Contact", bis: "Kontak Pang-emerhensiya ug Taga-atiman" },
  pwdEmergencyContactLabel: { en: "Emergency contact", tl: "Emergency Contact", bis: "Kontak Pang-emerhensiya" },
  pwdCaregiverContactLabel: { en: "Caregiver contact", tl: "Caregiver Contact", bis: "Kontak sa Taga-atiman" },
  pwdRelationshipLabel: { en: "Relationship", tl: "Relasyon", bis: "Relasyon" },

  pwdPhysicalAppearanceHeader: { en: "Physical appearance", tl: "Pisikal na Anyo", bis: "Panglawas nga Paghulagway" },
  pwdHeightLabel: { en: "Height (cm)", tl: "Taas (cm)", bis: "Gitas-on (cm)" },
  pwdWeightLabel: { en: "Weight (kg)", tl: "Timbang (kg)", bis: "Gibug-aton (kg)" },
  pwdHairColorLabel: { en: "Color of hair", tl: "Kulay ng Buhok", bis: "Kolor sa Buhok" },
  pwdEyeColorLabel: { en: "Color of eyes", tl: "Kulay ng Mata", bis: "Kolor sa Mata" },
  pwdOtherMarksLabel: { en: "Other identifying marks", tl: "Ibang Kakaibang Tatak", bis: "Ubang Timailhan" },
  pwdCovidVaccineLabel: { en: "Willing to be vaccinated against COVID-19?", tl: "Handa bang magpabakuna laban sa COVID-19?", bis: "Andam ba magpabakuna batok sa COVID-19?" },
  pwdMedicalFrontlinerLabel: { en: "Are you a medical front liner?", tl: "Ikaw ba ay medical front liner?", bis: "Usa ka ba ka medical front liner?" },
  pwdUndecidedOption: { en: "Undecided", tl: "Hindi Sigurado", bis: "Wala pay Desisyon" },

  pwdSectoralFormHeader: { en: "Sectoral form: Person with Disability (PWD)", tl: "Sectoral Form: Person with Disability (PWD)", bis: "Sectoral Form: Person with Disability (PWD)" },
  pwdExistingIdQuestion: { en: "Do you have an existing PWD ID Number?", tl: "Mayroon ka bang kasalukuyang PWD ID Number?", bis: "Naa ka bay naa nang PWD ID Number?" },
  pwdExistingIdLabel: { en: "PWD ID number", tl: "PWD ID Number", bis: "PWD ID Number" },
  pwdExistingIdPlaceholder: { en: "Enter your existing PWD ID Number", tl: "Ilagay ang iyong kasalukuyang PWD ID Number", bis: "Isulat ang imong naa nang PWD ID Number" },
  pwdNoRecordFoundTitle: {
    en: "NO APPROVED PWD ID RECORD FOUND",
    tl: "WALANG NAHANAP NA REHISTRADONG PWD ID RECORD",
    bis: "WALAY NAKIT-AN NGA REHISTRADONG PWD ID RECORD",
  },
  pwdNoRecordFoundDesc: {
    en: "No existing PWD ID record found in the system for this number. Random or unregistered ID numbers are not allowed. You must have a registered New PWD ID application in the system before applying for Renewal or Replacement / Lost ID.",
    tl: "Hindi nahanap ang PWD ID number sa sistema. Bawal ang random o hindi rehistradong ID number. Kailangan mayroon kang naunang New PWD ID application sa system bago mag-apply para sa Renewal o Replacement / Lost ID.",
    bis: "Wala makit-i ang PWD ID number sa sistema. Bawal ang random o wala marehistro nga ID number. Kinahanglan adunay una nga New PWD ID application sa sistema una mag-apply para sa Renewal o Replacement / Lost ID.",
  },
  pwdRenewalReminder: {
    en: "Reminder: You must first register and get approved for a \"New App PWD ID\" before applying for Renewal.",
    tl: "Paalala: Kailangan munang magparehistro at maaprubahan sa \"New App PWD ID\" bago mag-apply para sa Renewal.",
    bis: "Pahibalo: Kinahanglan una magparehistro ug maaprubahan sa \"New App PWD ID\" una mag-apply para sa Renewal.",
  },
  pwdLossReminder: {
    en: "Reminder: You must first register and get approved for a \"New App PWD ID\" before applying for Replacement / Lost ID.",
    tl: "Paalala: Kailangan munang magparehistro at maaprubahan sa \"New App PWD ID\" bago mag-apply para sa Replacement / Lost ID.",
    bis: "Pahibalo: Kinahanglan una magparehistro ug maaprubahan sa \"New App PWD ID\" una mag-apply para sa Replacement / Lost ID.",
  },
  pwdAppApprovedTitle: {
    en: "PWD Application Approved",
    tl: "Aprubado na ang Iyong Aplikasyon sa PWD ID",
    bis: "Naaprobahan na ang Imong Aplikasyon sa PWD ID",
  },
  pwdAppApprovedDesc: {
    en: "Congratulations! Your PWD ID application has been verified and approved by the Social Services Development Department.",
    tl: "Binabati kita! Ang iyong aplikasyon para sa PWD ID ay opisyal nang nasuri at naaprubahan ng Social Services Development Department.",
    bis: "Pahalipay! Ang imong aplikasyon para sa PWD ID opisyal nang nasusi ug naaprobahan sa Social Services Development Department.",
  },
  seniorAppApprovedTitle: {
    en: "Senior Citizen Application Approved",
    tl: "Aprubado na ang Iyong Aplikasyon sa Senior Citizen ID",
    bis: "Naaprobahan na ang Imong Aplikasyon sa Senior Citizen ID",
  },
  seniorAppApprovedDesc: {
    en: "Congratulations! Your Senior Citizen ID application has been verified and approved by the Social Services Development Department.",
    tl: "Binabati kita! Ang iyong aplikasyon para sa Senior Citizen ID ay opisyal nang nasuri at naaprubahan ng Social Services Development Department.",
    bis: "Pahalipay! Ang imong aplikasyon para sa Senior Citizen ID opisyal nang nasusi ug naaprobahan sa Social Services Development Department.",
  },
  officialIdNumberLabel: {
    en: "Official Assigned ID Number",
    tl: "Opisyal na Numero ng ID",
    bis: "Opisyal nga Numero sa ID",
  },
  dateApprovedLabel: {
    en: "Date Approved",
    tl: "Petsa ng Pag-apruba",
    bis: "Petsa sa Pag-aprobar",
  },
  viewInMyApplications: {
    en: "View in My Applications",
    tl: "Tingnan sa Aking mga Aplikasyon",
    bis: "Tan-awa sa Akong mga Aplikasyon",
  },
  useThisIdForRenewal: {
    en: "Use this Approved ID",
    tl: "Gamitin ang Aprubadong ID na Ito",
    bis: "Gamita kini nga Naaprobahang ID",
  },
  applyForRenewal: {
    en: "Apply for Renewal",
    tl: "Mag-apply para sa Renewal",
    bis: "Mag-apply para sa Renewal",
  },
  pwdEnterIdPrompt: {
    en: "Please enter your PWD ID number before verifying.",
    tl: "Mangyaring ilagay ang iyong PWD ID number bago mag-verify.",
    bis: "Palihug ibutang ang imong PWD ID number una mag-verify.",
  },
  pwdVerifyErrorGeneric: {
    en: "An error occurred while verifying the PWD ID. Please try again.",
    tl: "Nagkaroon ng error sa pag-verify ng PWD ID. Pakisubukan muli.",
    bis: "Adunay sayop nga nahitabo sa pag-verify sa PWD ID. Palihug sulayi pag-usab.",
  },
  pwdClassificationLabel: { en: "Classification of disability", tl: "Klasipikasyon ng Kapansanan", bis: "Klasipikasyon sa Kapansanon" },
  pwdApparentOption: { en: "Apparent Disability", tl: "Apparent Disability", bis: "Apparent Disability" },
  pwdNonApparentOption: { en: "Non-Apparent Disability", tl: "Non-Apparent Disability", bis: "Non-Apparent Disability" },
  pwdEthnicGroupLabel: { en: "Ethnic group", tl: "Etnikong Grupo", bis: "Etnikong Grupo" },
  pwdSpecifyEthnicGroupLabel: { en: "Specify ethnic group", tl: "Tukuyin ang Etnikong Grupo", bis: "Isulti ang Etnikong Grupo" },
  pwdSpecifyEthnicGroupPlaceholder: { en: "Enter ethnic group", tl: "Ilagay ang etnikong grupo", bis: "Isulat ang etnikong grupo" },
  pwdCauseOfDisabilityLabel: { en: "Cause of Disability", tl: "Sanhi ng Kapansanan", bis: "Hinungdan sa Kapansanan" },
  pwdSpecificDisabilityLabel: { en: "Specific Disability (optional)", tl: "Tiyak na Kapansanan (opsyonal)", bis: "Espesipiko nga Kapansanan (opsyonal)" },
  pwdEducationalAttainmentLabel: { en: "Educational attainment", tl: "Antas ng Edukasyon", bis: "Nahuman nga Edukasyon" },
  pwdCurrentlyStudyingLabel: { en: "Currently studying?", tl: "Kasalukuyang Nag-aaral?", bis: "Nag-eskwela ba karon?" },
  pwdStatusEmploymentLabel: { en: "Status of employment", tl: "Katayuan sa Trabaho", bis: "Kahimtang sa Trabaho" },
  pwdCategoryEmploymentLabel: { en: "Category of employment", tl: "Kategorya ng Trabaho", bis: "Kategorya sa Trabaho" },
  pwdCompanyNameLabel: { en: "Name of company/agency", tl: "Pangalan ng Kompanya/Ahensya", bis: "Ngalan sa Kompanya/Ahensya" },
  pwdCompanyAddressLabel: { en: "Company/agency address", tl: "Address ng Kompanya/Ahensya", bis: "Address sa Kompanya/Ahensya" },
  pwdSssLabel: { en: "SSS number", tl: "SSS Number", bis: "SSS Number" },
  pwdGsisLabel: { en: "GSIS number", tl: "GSIS Number", bis: "GSIS Number" },
  pwdPhilhealthLabel: { en: "PhilHealth number", tl: "PhilHealth Number", bis: "PhilHealth Number" },
  pwdPagibigLabel: { en: "Pag-IBIG number", tl: "Pag-IBIG Number", bis: "Pag-IBIG Number" },

  pwdAllowedFileTypesLabel: {
    en: "Allowed file types: JPG, JPEG, PNG, HEIF, HEIC, HEI, PDF, DOCX",
    tl: "Pinapayagang uri ng file: JPG, JPEG, PNG, HEIF, HEIC, HEI, PDF, DOCX",
    bis: "Gitugotan nga matang sa file: JPG, JPEG, PNG, HEIF, HEIC, HEI, PDF, DOCX",
  },
  pwdStillNeedsUploadNote: { en: "Still needs to be uploaded.", tl: "Kailangan pa i-upload.", bis: "Kinahanglan pa i-upload." },

  pwdReviewHeader: { en: "Submit your application", tl: "Isumite ang Iyong Aplikasyon", bis: "Isumite ang Imong Aplikasyon" },
  pwdReviewDesc: { en: "Double check everything before submitting. You can edit any section.", tl: "I-double check ang lahat bago mag-submit. Pwede mong i-edit ang anumang section.", bis: "I-doble tan-aw ang tanan sa dili pa mag-submit. Mahimo nimong i-edit ang bisan unsang seksyon." },
  pwdDocumentsSectionTitle: { en: "Documents", tl: "Mga Dokumento", bis: "Mga Dokumento" },
  pwdCivilStatusDisplayLabel: { en: "Civil status", tl: "Kalagayan Sibil", bis: "Kahimtang Sibil" },
  pwdDobDisplayLabel: { en: "Date of birth", tl: "Kapanganakan", bis: "Petsa sa Pagkatawo" },
  pwdNotYetUploadedLabel: { en: "Not yet uploaded", tl: "Wala pang na-upload", bis: "Wala pa na-upload" },
  pwdAllCompleteNote: {
    en: "✓ All required information and documents are complete. Ready to submit!",
    tl: "✓ Lahat ng required information at documents ay complete. Ready na para mag-submit!",
    bis: "✓ Kompleto na ang tanang gikinahanglan nga impormasyon ug dokumento. Andam na para i-submit!",
  },

  pwdSubmittingTitle: { en: "Submitting your application", tl: "Isinusumite ang iyong aplikasyon", bis: "Gisumite ang imong aplikasyon" },
  pwdWaitingApprovalMsg: {
    en: "Thank you, {name}. Your PWD ID application has been received and is now waiting for approval by a social worker.",
    tl: "Salamat, {name}. Natanggap na ang iyong aplikasyon para sa PWD ID at hinihintay na ngayon ang pag-apruba ng social worker.",
    bis: "Salamat, {name}. Nadawat na ang imong aplikasyon para sa PWD ID ug naghulat na karon sa pag-apruba sa social worker.",
  },
  pwdBackToServicesButton: {
    en: "← Back to PWD & Senior Citizen Services",
    tl: "← Bumalik sa Serbisyo para sa PWD at Senior Citizen",
    bis: "← Balik sa Serbisyo para sa PWD ug Senior Citizen",
  },

  pwdAppointmentHeader: { en: "Request an appointment", tl: "Hiling ng Appointment", bis: "Hangyo og Appointment" },
  pwdConfirmSubmitNote: {
    en: "By clicking \"Confirm & Submit\", your appointment request will be sent to the PDAO office. Your appointment schedule will appear on your application status once confirmed by the social worker.",
    tl: "Sa pag-click ng \"Confirm & Submit\", ipapadala ang iyong hiling ng appointment sa PDAO office. Ang iyong appointment schedule ay lalabas sa status ng iyong application kapag na-confirm na ng social worker.",
    bis: "Sa pag-click sa \"Confirm & Submit\", ipadala ang imong hangyo sa appointment sa PDAO office. Ang imong appointment schedule motungha sa status sa imong application kung na-confirm na sa social worker.",
  },

  // ─────────────────────────────────────────────
  // Solo Parent Application Wizard (SoloParentApplicationWizard.tsx)
  // ─────────────────────────────────────────────
  spStepDocuments: { en: "Sample documents", tl: "Mga Sample na Dokumento", bis: "Mga Sample nga Dokumento" },

  spChecklistTitle: { en: "Service and primary requirements", tl: "Mga Kinakailangan sa Serbisyo at sa Pangunahing Kinakailangan", bis: "Mga Kinahanglanon sa Serbisyo ug Panguna nga Kinahanglanon" },
  spResidentQuestion: { en: "Are you a legitimate resident of Quezon City?", tl: "Ikaw ba ay isang lehitimong residente ng Quezon City?", bis: "Ikaw ba usa ka lehitimong residente sa Quezon City?" },
  spResidentRequiredNote: { en: "You need to check this to continue.", tl: "Kailangan i-check ito para magpatuloy.", bis: "Kinahanglan i-check kini para magpadayon." },
  spApplicationTypeQuestion: { en: "What type of application do you have?", tl: "Ano ang uri ng iyong aplikasyon?", bis: "Unsa ang matang sa imong aplikasyon?" },
  spNewApplicationOption: { en: "Not yet, NEW APPLICATION", tl: "Wala pa, BAGONG APLIKASYON", bis: "Wala pa, BAG-ONG APLIKASYON" },
  spRenewalOption: { en: "Yes, this is a RENEWAL", tl: "Oo, ito ay RENEWAL", bis: "Oo, kini RENEWAL" },
  spLossIdOption: { en: "ID was lost (LOSS ID)", tl: "Nawala ang ID (LOSS ID)", bis: "Nawala ang ID (LOSS ID)" },
  spChooseOneNote: { en: "You need to choose one.", tl: "Kailangan pumili ng isa.", bis: "Kinahanglan mopili og usa." },
  spNewApplicationNote: { en: "NEW APPLICATION: First-time Solo Parent application. Complete all requirements.", tl: "BAGONG APLIKASYON: First-time Solo Parent application. Kumpletuhin ang lahat ng kinakailangan.", bis: "BAG-ONG APLIKASYON: First-time Solo Parent application. Kompletoha ang tanang kinahanglanon." },
  spRenewalNote: { en: "RENEWAL: Updating your existing Solo Parent ID. Prepare your old ID card.", tl: "RENEWAL: Ina-update ang iyong kasalukuyang Solo Parent ID. Ihanda ang iyong lumang ID card.", bis: "RENEWAL: Gi-update ang imong naa nang Solo Parent ID. Andama ang imong daan nga ID card." },
  spLossIdNote: { en: "LOSS ID: Replacement request for a lost Solo Parent ID. Prepare an Affidavit of Loss.", tl: "LOSS ID: Hiling ng kapalit para sa nawalang Solo Parent ID. Ihanda ang Affidavit of Loss.", bis: "LOSS ID: Hangyo og puli para sa nawala nga Solo Parent ID. Andama ang Affidavit of Loss." },
  spStatusNoneNew: { en: "None yet (New application)", tl: "Wala pa (Bagong aplikasyon)", bis: "Wala pa (Bag-ong aplikasyon)" },
  spAppTypeNew: { en: "New Solo Parent ID", tl: "Bagong Solo Parent ID", bis: "Bag-ong Solo Parent ID" },
  spAppTypeRenewal: { en: "Renewal Solo Parent ID", tl: "Pag-renew ng Solo Parent ID", bis: "Pag-renew sa Solo Parent ID" },
  spAppTypeLoss: { en: "Replacement / Lost Solo Parent ID", tl: "Kapalit / Nawalang Solo Parent ID", bis: "Kabaylo / Nawala nga Solo Parent ID" },
  spLabelIdStatus: { en: "Solo Parent ID Status", tl: "Katayuan ng Solo Parent ID", bis: "Kahimtang sa Solo Parent ID" },
  spLabelIdNumber: { en: "Solo Parent ID / QCID Number", tl: "Numero ng Solo Parent ID / QCID", bis: "Numero sa Solo Parent ID / QCID" },
  spLabelAppType: { en: "Application Type", tl: "Uri ng Aplikasyon", bis: "Matang sa Aplikasyon" },
  spLabelCategoryReason: { en: "Solo Parent Category / Reason", tl: "Kategorya / Dahilan ng Solo Parent", bis: "Kategorya / Rason sa Solo Parent" },
  spLabelExistingVerified: { en: "Existing record verified", tl: "Na-verify ang umiiral na rekord", bis: "Namatud-an ang kasamtangang rekord" },

  spClassificationHeader: { en: "II. Classification / Circumstances of Being a Solo Parent", tl: "II. Classification / Circumstances ng Pagiging Solo Parent", bis: "II. Classification / Kahimtang sa Pagka-Solo Parent" },
  spClassificationDesc: { en: "Choose the basis of your solo parent status.", tl: "Pumili ng batayan ng iyong solo parent status.", bis: "Pilia ang basihan sa imong solo parent status." },

  spFormTitle: { en: "APPLICATION FORM FOR SOLO PARENT", tl: "APPLICATION FORM FOR SOLO PARENT", bis: "APPLICATION FORM FOR SOLO PARENT" },
  spFormDesc: {
    en: "Please complete the following information. Fields marked with * are required.",
    tl: "Pakikumpleto ang mga sumusunod na impormasyon. Ang mga field na may * ay kinakailangan.",
    bis: "Palihug kompletoha ang mosunod nga impormasyon. Ang mga field nga naay * gikinahanglan.",
  },
  spSectionName: { en: "NAME", tl: "PANGALAN", bis: "NGALAN" },
  spSectionPersonalDetails: { en: "PERSONAL DETAILS", tl: "PERSONAL DETAILS", bis: "PERSONAL DETAILS" },
  spPlaceOfBirthLabel: { en: "Place of Birth", tl: "Lugar ng Kapanganakan", bis: "Dapit sa Pagkatawo" },
  spEducAttainmentLabel: { en: "Highest Educational Attainment", tl: "Pinakamataas na Naabot na Edukasyon", bis: "Pinakataas nga Nakab-ot nga Edukasyon" },
  spCompanyAgencyLabel: { en: "Company / Agency", tl: "Kompanya / Ahensya", bis: "Kompanya / Ahensya" },
  spMonthlyIncomeLabel: { en: "Monthly Income", tl: "Buwanang Kita", bis: "Bulanang Kita" },
  spTotalFamilyIncomeLabel: { en: "Total Family Income", tl: "Kabuuang Kita ng Pamilya", bis: "Total nga Kita sa Pamilya" },
  spContactNoLabel: { en: "Telephone / Cellphone No.", tl: "Numero ng Telepono / Cellphone", bis: "Numero sa Telepono / Cellphone" },
  spSectionAddress: { en: "ADDRESS", tl: "ADDRESS", bis: "ADDRESS" },
  spHouseNoLabel: { en: "House #", tl: "Numero ng Bahay", bis: "Numero sa Balay" },
  spStreetLabel: { en: "Street", tl: "Kalye", bis: "Dalan" },
  spCityMunicipalityLabel: { en: "City / Municipality", tl: "Lungsod / Bayan", bis: "Lungsod / Bayan" },

  spSectionFamilyComposition: { en: "I. FAMILY COMPOSITION", tl: "I. FAMILY COMPOSITION", bis: "I. FAMILY COMPOSITION" },
  spFamilyCompositionDesc: {
    en: "Include family members and other household members, especially minor children.",
    tl: "Isama ang mga kapamilya at ibang miyembro ng sambahayan, lalo na ang mga menor de edad na anak.",
    bis: "Iapil ang mga sakop sa pamilya ug ubang membro sa panimalay, ilabina ang mga menor de edad nga anak.",
  },
  spMemberLabel: { en: "Member #{n}", tl: "Miyembro #{n}", bis: "Miyembro #{n}" },
  spRemoveMember: { en: "Remove", tl: "Alisin", bis: "Tangtanga" },
  spNameLabel: { en: "Name", tl: "Pangalan", bis: "Ngalan" },
  spRelationshipLabel: { en: "Relationship", tl: "Relasyon", bis: "Relasyon" },
  spBirthdayLabel: { en: "Birthday", tl: "Kaarawan", bis: "Adlawng Natawhan" },
  spStatusLabel: { en: "Status", tl: "Katayuan", bis: "Kahimtang" },
  spStatusPlaceholder: { en: "Single, Married, etc.", tl: "Single, Married, atbp.", bis: "Single, Married, ug uban pa." },
  spOccupationIncomeLabel: { en: "Occupation / Monthly Income", tl: "Trabaho / Buwanang Kita", bis: "Trabaho / Bulanang Kita" },
  spAddFamilyMember: { en: "Add family member", tl: "Magdagdag ng kapamilya", bis: "Pagdugang og sakop sa pamilya" },

  spSectionEmergency: { en: "IN CASE OF EMERGENCY", tl: "SAKALING MAY EMERGENCY", bis: "KUNG NAAY EMERGENCY" },
  spEmergencyNameLabel: { en: "Name", tl: "Pangalan", bis: "Ngalan" },
  spEmergencyContactNoLabel: { en: "Contact Number", tl: "Numero ng Contact", bis: "Numero sa Kontak" },
  spEmergencyAddressLabel: { en: "Address", tl: "Address", bis: "Address" },

  spSectionClassification: { en: "II. CLASSIFICATION / CIRCUMSTANCES OF BEING A SOLO PARENT", tl: "II. CLASSIFICATION / CIRCUMSTANCES NG PAGIGING SOLO PARENT", bis: "II. CLASSIFICATION / KAHIMTANG SA PAGKA-SOLO PARENT" },
  spSelectedBasisLabel: { en: "Selected basis: {basis}", tl: "Napiling batayan: {basis}", bis: "Gipili nga basihan: {basis}" },
  spDescribeSituationLabel: { en: "Describe your situation", tl: "Ilarawan ang iyong sitwasyon", bis: "Ihulagway ang imong sitwasyon" },
  spDescribeSituationPlaceholder: {
    en: "Example: I have been a widow since 2022, and I have been raising my two children on my own...",
    tl: "Halimbawa: Biyuda ako mula noong 2022, sinusuportahan ko nang mag-isa ang aking dalawang anak...",
    bis: "Pananglitan: Balo ko sukad 2022, gisuportahan nako ang akong duha ka anak nga usa ra...",
  },

  spSectionNeeds: { en: "III. NEEDS / PROBLEMS OF BEING A SOLO PARENT", tl: "III. NEEDS / PROBLEMS NG PAGIGING SOLO PARENT", bis: "III. NEEDS / PROBLEMA SA PAGKA-SOLO PARENT" },
  spNeedsQuestion: { en: "What needs or problems are you facing?", tl: "Ano ang mga pangangailangan o problemang kinakaharap mo?", bis: "Unsa ang mga panginahanglan o problema nga imong giatubang?" },

  spSectionResources: { en: "IV. FAMILY RESOURCES", tl: "IV. FAMILY RESOURCES", bis: "IV. FAMILY RESOURCES" },
  spResourcesQuestion: { en: "What assistance or support do you receive (if any)?", tl: "Anong tulong o suporta ang natatanggap mo (kung meron)?", bis: "Unsa nga tabang o suporta ang imong nadawat (kung naa)?" },

  spCertifyNote: {
    en: "I hereby certify that the information given above are true and correct. I further understand that any misrepresentation may subject me to criminal and civil liabilities provided for by existing laws.",
    tl: "Pinatutunayan ko na ang mga impormasyong ibinigay sa itaas ay totoo at tama. Nauunawaan ko rin na ang anumang maling pagsasalarawan ay maaaring magpasakop sa akin sa kriminal at sibil na pananagutan ayon sa umiiral na batas.",
    bis: "Gipamatud-an nako nga ang impormasyon nga gihatag sa taas tinuod ug husto. Nasabtan usab nako nga ang bisan unsang sayop nga pagpahayag mahimong magpasangil kanako sa kriminal ug sibil nga pananagutan sumala sa umaabot nga balaod.",
  },

  spDocIntroTitle: { en: "Sample of documents to submit.", tl: "Mga sample ng dokumentong ipapasa.", bis: "Mga sample sa dokumento nga isumite." },
  spDocIntroDesc1: {
    en: "If any requirements are still missing or incorrect, make sure to bring the complete documents on the day of your interview.",
    tl: "Kung kulang pa o may mali sa mga requirements, siguraduhin na kumpletong madadala ang mga ito sa araw ng interview.",
    bis: "Kung naa pay kulang o sayop sa mga requirements, siguroha nga kompleto nga madala kini sa adlaw sa interview.",
  },
  spDocIntroDesc2: {
    en: "Click \"SAMPLE DOCUMENT\" above each file upload to see a sample and make sure your upload matches the required format. You may upload multiple files per document.",
    tl: "I-click ang \"SAMPLE DOCUMENT\" sa itaas ng bawat file upload para makita ang sample file at matiyak na ang iyong upload ay tumutugma sa kinakailangang format. Pwede kang mag-upload ng maraming file kada dokumento.",
    bis: "I-click ang \"SAMPLE DOCUMENT\" sa ibabaw sa matag file upload para makita ang sample file ug siguroha nga ang imong upload motugma sa gikinahanglan nga format. Mahimo kang mag-upload og daghang file matag dokumento.",
  },
  spDocForNewLabel: { en: "FOR NEW APPLICATION", tl: "PARA SA BAGONG APLIKASYON", bis: "PARA SA BAG-ONG APLIKASYON" },
  spDocForRenewalLabel: { en: "FOR RENEWAL", tl: "PARA SA RENEWAL", bis: "PARA SA RENEWAL" },
  spDocForLossLabel: { en: "FOR LOSS ID", tl: "PARA SA LOSS ID", bis: "PARA SA LOSS ID" },
  spDocFileTypeNote: {
    en: "Only JPG, PNG, or PDF files are accepted per document. Make sure the content is clear before submitting.",
    tl: "Tanggap ang JPG, PNG, o PDF na file bawat dokumento. Siguraduhing malinaw ang nilalaman bago i-submit.",
    bis: "Dawaton ang JPG, PNG, o PDF nga file matag dokumento. Siguroha nga klaro ang sulod sa dili pa i-submit.",
  },

  spReviewTitle: { en: "REVIEW YOUR APPLICATION", tl: "SURIIN ANG IYONG APPLICATION", bis: "SUSIHA ANG IMONG APPLICATION" },
  spReviewDesc: {
    en: "Please review all information carefully before submitting your application. You can edit any section by clicking \"EDIT\".",
    tl: "Mangyaring suriin nang mabuti ang lahat ng impormasyon bago i-submit ang iyong application. Maaari mong i-edit ang anumang seksyon sa pamamagitan ng pag-click sa \"I-EDIT\".",
    bis: "Palihug susiha pag-ayo ang tanang impormasyon sa dili pa i-submit ang imong application. Mahimo nimong i-edit ang bisan unsang seksyon pinaagi sa pag-click sa \"I-EDIT\".",
  },
  spReviewRequirementsTitle: { en: "Requirements", tl: "Mga Kinakailangan", bis: "Mga Kinahanglanon" },
  spReviewResidentLabel: { en: "Are you a legitimate resident of Quezon City?", tl: "Ikaw ba ay isang lehitimong residente ng Quezon City?", bis: "Ikaw ba usa ka lehitimong residente sa Quezon City?" },
  spReviewAppTypeNewLabel: { en: "Application type — NEW APPLICATION", tl: "Uri ng Aplikasyon — BAGONG APLIKASYON", bis: "Matang sa Aplikasyon — BAG-ONG APLIKASYON" },
  spReviewAppTypeRenewalLabel: { en: "Application type — RENEWAL", tl: "Uri ng Aplikasyon — RENEWAL", bis: "Matang sa Aplikasyon — RENEWAL" },
  spReviewAppTypeLossLabel: { en: "Application type — LOSS ID", tl: "Uri ng Aplikasyon — LOSS ID", bis: "Matang sa Aplikasyon — LOSS ID" },
  spReviewAppTypeUnsetLabel: { en: "What type of application do you have?", tl: "Ano ang uri ng iyong aplikasyon?", bis: "Unsa ang matang sa imong aplikasyon?" },
  spReviewClassificationLabel: { en: "Classification: {basis}", tl: "Classification: {basis}", bis: "Classification: {basis}" },
  spReviewClassificationUnsetLabel: { en: "Classification / Circumstances of Being a Solo Parent", tl: "Classification / Circumstances ng Pagiging Solo Parent", bis: "Classification / Kahimtang sa Pagka-Solo Parent" },

  spReviewPersonalInfoTitle: { en: "Personal information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  spReviewNameHeader: { en: "Name", tl: "Pangalan", bis: "Ngalan" },
  spReviewFullNameLabel: { en: "Full Name", tl: "Buong Pangalan", bis: "Tibuok Ngalan" },
  spReviewAgeSexLabel: { en: "Age / Sex", tl: "Edad / Kasarian", bis: "Edad / Sekso" },
  spReviewDobLabel: { en: "Date of Birth", tl: "Petsa ng Kapanganakan", bis: "Petsa sa Pagkatawo" },
  spReviewPobLabel: { en: "Place of Birth", tl: "Lugar ng Kapanganakan", bis: "Dapit sa Pagkatawo" },
  spReviewEducAttainmentLabel: { en: "Highest Educational Attainment", tl: "Pinakamataas na Naabot na Edukasyon", bis: "Pinakataas nga Nakab-ot nga Edukasyon" },
  spReviewOccupationCompanyLabel: { en: "Occupation / Company", tl: "Trabaho / Kompanya", bis: "Trabaho / Kompanya" },
  spReviewMonthlyIncomeLabel: { en: "Monthly Income", tl: "Buwanang Kita", bis: "Bulanang Kita" },
  spReviewTotalFamilyIncomeLabel: { en: "Total Family Income", tl: "Kabuuang Kita ng Pamilya", bis: "Total nga Kita sa Pamilya" },
  spReviewContactLabel: { en: "Telephone / Cellphone", tl: "Telepono / Cellphone", bis: "Telepono / Cellphone" },
  spReviewAddressHeader: { en: "Address", tl: "Address", bis: "Address" },
  spReviewCompleteAddressLabel: { en: "Complete Address", tl: "Kumpletong Address", bis: "Kompleto nga Address" },
  spReviewFamilyCompositionHeader: { en: "I. Family Composition", tl: "I. Family Composition", bis: "I. Family Composition" },
  spReviewEmergencyHeader: { en: "In Case of Emergency", tl: "Sakaling May Emergency", bis: "Kung Naay Emergency" },
  spReviewEmergencyNameLabel: { en: "Name", tl: "Pangalan", bis: "Ngalan" },
  spReviewEmergencyContactLabel: { en: "Contact #", tl: "Contact #", bis: "Contact #" },
  spReviewEmergencyAddressLabel: { en: "Address", tl: "Address", bis: "Address" },
  spReviewCircumstancesHeader: { en: "II–IV. Circumstances, Needs, Resources", tl: "II–IV. Circumstances, Needs, Resources", bis: "II–IV. Circumstances, Needs, Resources" },
  spReviewCircumstancesLabel: { en: "Classification / Circumstances", tl: "Classification / Circumstances", bis: "Classification / Circumstances" },
  spReviewNeedsLabel: { en: "Needs / Problems", tl: "Needs / Problems", bis: "Needs / Problems" },
  spReviewResourcesLabel: { en: "Family Resources", tl: "Family Resources", bis: "Family Resources" },

  spReviewDocumentsTitle: { en: "Required documents", tl: "Mga Kinakailangang Dokumento", bis: "Mga Gikinahanglan nga Dokumento" },
  spReviewNoFileUploaded: { en: "No file uploaded yet.", tl: "Wala pang na-upload na file.", bis: "Wala pa nay na-upload nga file." },

  spSubmitConfirmNote: {
    en: "By clicking \"NEXT\", you confirm that all information provided is true and complete. Your application will be reviewed by an evaluator, and you will receive a notification to your email about the status of your application.",
    tl: "Sa pag-click ng \"NEXT\", kinukumpirma mo na ang lahat ng impormasyong ibinigay ay tama at kumpleto. Ang iyong application ay susuriin ng isang evaluator, at makakatanggap ka ng notification sa iyong email tungkol sa status ng iyong application.",
    bis: "Sa pag-click sa \"NEXT\", gikumpirma nimo nga husto ug kumpleto ang tanang impormasyon nga gihatag. Ang imong application susihon sa usa ka evaluator, ug makadawat ka og notification sa imong email bahin sa status sa imong application.",
  },

  spAppointmentTitle: { en: "REQUEST AN APPOINTMENT", tl: "HILING NG APPOINTMENT", bis: "HANGYO OG APPOINTMENT" },
  spAppointmentDesc: {
    en: "The date and time of your appointment will be set by a social worker after reviewing your application. You don't need to choose a schedule — you'll receive a notification once it has been set.",
    tl: "Ang petsa at oras ng iyong appointment ay itatakda ng isang social worker matapos suriin ang iyong application. Hindi ka na kailangang pumili ng schedule — makakatanggap ka ng notification kapag na-set na ito.",
    bis: "Ang petsa ug oras sa imong appointment i-set sa usa ka social worker human masusi ang imong application. Dili na nimo kinahanglan mopili og schedule — makadawat ka og notification kung na-set na kini.",
  },
  spAppointmentConfirmNote: {
    en: "By clicking \"CONFIRM & SUBMIT\", your appointment request will be sent to the SSDD / Community Outreach Division. Your appointment schedule will appear on your application status once confirmed by the social worker.",
    tl: "Sa pag-click ng \"CONFIRM & SUBMIT\", ipapadala ang iyong hiling ng appointment sa SSDD / Community Outreach Division. Ang iyong appointment schedule ay lalabas sa status ng iyong application kapag na-confirm na ng social worker.",
    bis: "Sa pag-click sa \"CONFIRM & SUBMIT\", ipadala ang imong hangyo sa appointment sa SSDD / Community Outreach Division. Ang imong appointment schedule motungha sa status sa imong application kung na-confirm na sa social worker.",
  },

  spBackButton: { en: "BACK", tl: "BUMALIK", bis: "BALIK" },
  spNextButton: { en: "NEXT", tl: "SUSUNOD", bis: "SUNOD" },
  spConfirmSubmitButton: { en: "CONFIRM & SUBMIT", tl: "CONFIRM & SUBMIT", bis: "CONFIRM & SUBMIT" },

  spSubmittingTitle: { en: "Submitting your application", tl: "Isinusumite ang iyong aplikasyon", bis: "Gisumite ang imong aplikasyon" },
  spSubmittingDesc: { en: "This will only take a moment...", tl: "Sandali lang po...", bis: "Sandali ra po..." },
  spWaitingApprovalTitle: { en: "Waiting for admin approval", tl: "Naghihintay ng Pag-apruba", bis: "Naghulat og Pag-apruba" },
  spWaitingApprovalMsg: {
    en: "Thank you, {name}. Your Solo Parent {type} has been received and is now waiting for approval by a social worker.",
    tl: "Salamat, {name}. Ang iyong Solo Parent {type} ay natanggap na at hinihintay na ngayon ang approval ng isang social worker.",
    bis: "Salamat, {name}. Ang imong Solo Parent {type} nadawat na ug naghulat na karon sa approval sa usa ka social worker.",
  },
  spTypeApplication: { en: "application", tl: "application", bis: "application" },
  spTypeRenewal: { en: "renewal", tl: "renewal", bis: "renewal" },
  spTypeReplacementRequest: { en: "replacement request", tl: "replacement request", bis: "replacement request" },
  spReferenceNumberLabel: { en: "Reference Number", tl: "Reference Number", bis: "Reference Number" },
  spAppointmentScheduleLabel: { en: "Appointment schedule", tl: "Appointment schedule", bis: "Appointment schedule" },
  spAppointmentPendingNote: { en: "Pending — to be set by the social worker", tl: "Hihintayin — itatakda ng social worker", bis: "Hulaton — i-set sa social worker" },
  spSaveReferenceNote: {
    en: "Please save your reference number to track your application status.",
    tl: "Paki-save ang iyong reference number para ma-track ang status ng iyong application.",
    bis: "Palihug i-save ang imong reference number para masubay ang status sa imong application.",
  },
  spBackToServicesButton: {
    en: "← Back to Solo Parent & Child Welfare",
    tl: "← Bumalik sa Solo Parent at Kapakanan ng Bata",
    bis: "← Balik sa Solo Parent ug Kaayohan sa Bata",
  },

  spFieldRequiredNote: { en: "This field is required.", tl: "Kailangan punan ang field na ito.", bis: "Kinahanglan sudlan ang field nga kini." },
  spDocRequiredNote: { en: "You need to upload this document.", tl: "Kailangan mag-upload ng dokumentong ito.", bis: "Kinahanglan mag-upload sa dokumento nga kini." },

  // Requirements Modals / Dialogs
  reminderTitle: { en: "REMINDER", tl: "PAALALA", bis: "PAHIBALO" },
  pwdAssistanceReqTitle: { en: "Requirements for PWD Social Assistance", tl: "Mga Kinakailangan para sa PWD Social Assistance", bis: "Mga Kinahanglanon para sa PWD Social Assistance" },
  seniorIdReqTitle: { en: "Requirements for Application of Senior Citizen (SENIOR) ID", tl: "Mga Kinakailangan sa Aplikasyon ng Senior Citizen (SENIOR) ID", bis: "Mga Kinahanglanon sa Aplikasyon sa Senior Citizen (SENIOR) ID" },
  seniorMedicineReqTitle: { en: "Requirements for Medicine Discount Booklet", tl: "Mga Kinakailangan para sa Medicine Discount Booklet", bis: "Mga Kinahanglanon para sa Medicine Discount Booklet" },
  seniorMovieReqTitle: { en: "Requirements for Free Movie Booklet", tl: "Mga Kinakailangan para sa Free Movie Booklet", bis: "Mga Kinahanglanon para sa Free Movie Booklet" },
  seniorSocialReqTitle: { en: "Requirements for Senior Citizen Social Assistance", tl: "Mga Kinakailangan para sa Senior Citizen Social Assistance", bis: "Mga Kinahanglanon para sa Senior Citizen Social Assistance" },
  pwdIdReqTitle: { en: "Requirements for Application of QC PWD ID", tl: "Mga Kinakailangan sa Aplikasyon ng QC PWD ID", bis: "Mga Kinahanglanon sa Aplikasyon sa QC PWD ID" },

  badgeSocialAssistance: { en: "Social Assistance", tl: "Tulong Panlipunan", bis: "Tabang Panlipunan" },
  badgeNewApplication: { en: "New Application", tl: "Bagong Aplikasyon", bis: "Bag-ong Aplikasyon" },
  badgeRenewal: { en: "Renewal", tl: "Pag-renew", bis: "Pag-renew" },
  badgeMedicineBooklet: { en: "Medicine Booklet", tl: "Medicine Booklet", bis: "Medicine Booklet" },
  badgeMovieBooklet: { en: "Movie Booklet", tl: "Movie Booklet", bis: "Movie Booklet" },

  pwdAssistanceReminderDesc: {
    en: "Please read and prepare all the required documents for PWD Social Assistance.",
    tl: "Mangyaring basahin at ihanda ang lahat ng mga kinakailangang dokumento para sa PWD Social Assistance.",
    bis: "Palihug basaha ug andama ang tanang gikinahanglang dokumento para sa PWD Social Assistance.",
  },
  pwdAssistanceBanner: {
    en: "PWD Social Assistance — Simplified Application",
    tl: "PWD Social Assistance — Pinadaling Aplikasyon",
    bis: "PWD Social Assistance — Pinasayon nga Aplikasyon",
  },
  pwdGeneralReminderDesc: {
    en: "Please scroll and read all requirements below.",
    tl: "Mangyaring mag-scroll at basahin ang lahat ng kinakailangan sa ibaba.",
    bis: "Palihug pag-scroll ug basaha ang tanang kinahanglanon sa ubos.",
  },
  pwdRenewalAlert: {
    en: "RENEWAL — Please prepare your current PWD ID Number before proceeding.",
    tl: "RENEWAL — Mag-ihanda ng iyong kasalukuyang PWD ID Number bago mag-proceed.",
    bis: "RENEWAL — Andama ang imong kasamtangang PWD ID Number sa dili pa mopadayon.",
  },
  pwdNewAlert: {
    en: "NEW APPLICATION — Please complete all requirements before proceeding.",
    tl: "BAGONG APLIKASYON — Kumpletuhin ang lahat ng requirements bago mag-proceed.",
    bis: "BAG-ONG APLIKASYON — Kumpletoha ang tanang requirements sa dili pa mopadayon.",
  },
  seniorRenewalAlert: {
    en: "RENEWAL — Please prepare your current SENIOR ID Number before proceeding.",
    tl: "RENEWAL — Mag-ihanda ng iyong kasalukuyang SENIOR ID Number bago mag-proceed.",
    bis: "RENEWAL — Andama ang imong kasamtangang SENIOR ID Number sa dili pa mopadayon.",
  },
  seniorNewAlert: {
    en: "NEW APPLICATION — Please complete all requirements before proceeding.",
    tl: "BAGONG APLIKASYON — Kumpletuhin ang lahat ng requirements bago mag-proceed.",
    bis: "BAG-ONG APLIKASYON — Kumpletoha ang tanang requirements sa dili pa mopadayon.",
  },
  seniorDualCitizenshipNote: {
    en: "NOTE: This may apply to seniors with \"dual citizenship status\" if he/she can prove his/her Filipino Citizen status and has resided in this city for at least six (6) months.",
    tl: "PAALALA: Maaari itong mag-apply sa mga senior na may \"dual citizenship status\" kung mapapatunayan niya ang kanyang pagiging Mamamayang Pilipino at naninirahan sa lungsod na ito nang hindi bababa sa anim (6) na buwan.",
    bis: "PAHIBALO: Mahimo kini mag-apply sa mga senior nga adunay \"dual citizenship status\" kung mapamatud-an niya ang iyang pagka-Lungsuranong Pilipino ug nagpuyo niining dakbayan sulod sa labing menos unom (6) ka bulan.",
  },
  requiredDocumentsHeading: { en: "REQUIRED DOCUMENTS", tl: "MGA KINAKAILANGANG DOKUMENTO", bis: "MGA GIKINAHANGLANG DOKUMENTO" },
  pwdNewRenewalHeading: { en: "REQUIREMENTS (FOR NEW AND RENEWAL)", tl: "MGA KINAKAILANGAN (BAGOHAN AT RENEWAL)", bis: "MGA KINAHANGLANON (BAG-OHAN UG RENEWAL)" },
  apparentDisabilityHeading: { en: "FOR APPARENT DISABILITY:", tl: "PARA SA NAKIKITANG KAPANSANAN (APPARENT):", bis: "PARA SA MAKITA NGA KABAKANGAN (APPARENT):" },
  nonApparentDisabilityHeading: { en: "FOR NON-APPARENT DISABILITY:", tl: "PARA SA DI-NAKIKITANG KAPANSANAN (NON-APPARENT):", bis: "PARA SA DILI MAKITA NGA KABAKANGAN (NON-APPARENT):" },
  nonApparentSubtitle: {
    en: "Caused by chronic illness, cancer, and rare diseases",
    tl: "Dulot ng malubhang sakit, cancer, at mga pambihirang karamdaman",
    bis: "Tungod sa sakit nga grabe, cancer, ug mga talagsaong balatian",
  },
  seniorRequirementsHeading: { en: "REQUIREMENTS:", tl: "MGA KINAKAILANGAN:", bis: "MGA KINAHANGLANON:" },
  pwdPhotoClearNote: {
    en: "Ensure all photos are clear and readable before uploading in Step 3.",
    tl: "Tiyaking malinaw at nababasa ang lahat ng litrato bago mag-upload sa Step 3.",
    bis: "Siguroha nga tin-aw ug mabasa ang tanang litrato sa dili pa mag-upload sa Step 3.",
  },
  pwdBringDocumentsVerificationNote: {
    en: "Please bring all documents together with the accomplished QCITIZEN ID and PWD ID Application Form when you visit for verification.",
    tl: "Mangyaring dalhin ang lahat ng dokumento kasama ang napunang QCITIZEN ID at PWD ID Application Form kapag bumisita para sa beripikasyon.",
    bis: "Palihug dad-a ang tanang dokumento uban ang nasudlan nga QCITIZEN ID ug PWD ID Application Form kung mobisita para sa verification.",
  },
  seniorSocialReminder: {
    en: "Reminder: For Senior Citizen Social Assistance in Quezon City, please prepare the necessary documents and proof of need.",
    tl: "Paalala: Para sa Tulong Panlipunan (Social Assistance) ng Senior Citizens sa Quezon City, ihanda ang mga kaukulang dokumento at katibayan ng pangangailangan.",
    bis: "Pahibalo: Alang sa Social Assistance sa Senior Citizens sa Quezon City, i-andam ang mga gikinahanglang dokumento ug pruweba sa panginahanglan.",
  },
  seniorMedicineReminder: {
    en: "Reminder: For Senior Citizen Medicine Discount Booklet, ensure you have a valid Senior Citizen / OSCA ID.",
    tl: "Paalala: Para sa Medicine Discount Booklet ng Senior Citizen, tiyaking mayroong valid na Senior Citizen / OSCA ID.",
    bis: "Pahibalo: Alang sa Medicine Discount Booklet sa Senior Citizen, siguroha nga adunay valid nga Senior Citizen / OSCA ID.",
  },
  seniorMovieReminder: {
    en: "Reminder: For Senior Citizen Free Movie Booklet in Quezon City cinemas, prepare your valid OSCA ID.",
    tl: "Paalala: Para sa Free Movie Booklet ng Senior Citizen sa Quezon City cinemas, ihanda ang inyong valid OSCA ID.",
    bis: "Pahibalo: Alang sa Free Movie Booklet sa Senior Citizen sa mga sinehan sa Quezon City, i-andam ang inyong valid nga OSCA ID.",
  },
  seniorLossAlert: {
    en: "Reminder: For replacement of lost or damaged Senior Citizen ID. Prepare a Notarized Affidavit of Loss and valid ID.",
    tl: "Paalala: Para sa pagpapalit ng nawala o nasirang Senior Citizen ID. Ihanda ang Notarized Affidavit of Loss at valid ID.",
    bis: "Pahibalo: Alang sa pag-ilis sa nawala o naguba nga Senior Citizen ID. I-andam ang Notarized Affidavit of Loss ug valid nga ID.",
  },
  seniorRenewalReminder: {
    en: "Reminder: For renewal of expired or expiring Senior Citizen / OSCA ID.",
    tl: "Paalala: Para sa pag-renew ng expired o nag-eexpire na Senior Citizen / OSCA ID.",
    bis: "Pahibalo: Alang sa pag-renew sa expired o hapit na ma-expire nga Senior Citizen / OSCA ID.",
  },
  seniorSocialReq1: {
    en: "Senior Citizen ID / OSCA ID (Front and back copy)",
    tl: "Senior Citizen ID / OSCA ID (Kopya ng harapan at likod)",
    bis: "Senior Citizen ID / OSCA ID (Kopya sa atubangan ug luyo)",
  },
  seniorSocialReq2: {
    en: "Valid Government-issued ID with photo and signature",
    tl: "Valid Government-issued ID na may larawan at lagda",
    bis: "Valid nga Government-issued ID nga adunay litrato ug pirma",
  },
  seniorSocialReq3: {
    en: "Barangay Certificate of Residency or Indigency",
    tl: "Barangay Certificate of Residency o Indigency",
    bis: "Barangay Certificate of Residency o Indigency",
  },
  seniorSocialReq4: {
    en: "Recent 2×2 ID Picture (White background)",
    tl: "Kasalukuyang 2×2 ID Picture (White background)",
    bis: "Bag-ong 2×2 ID Picture (White background)",
  },
  seniorSocialReq5: {
    en: "Proof of Income / Certificate of Indigency (if applicable)",
    tl: "Proof of Income / Certificate of Indigency (kung kinakailangan)",
    bis: "Proof of Income / Certificate of Indigency (kung gikinahanglan)",
  },
  seniorSocialReq6: {
    en: "Medical Certificate / Prescription (for medical assistance)",
    tl: "Medical Certificate / Prescription (para sa tulong-medikal)",
    bis: "Medical Certificate / Prescription (para sa tabang-medikal)",
  },
  seniorSocialReq7: {
    en: "Other supporting documents verifying the request",
    tl: "Iba pang katibayan o dokumento na sumusuporta sa kahilingan",
    bis: "Uban pang pruweba o dokumento nga nagsuporta sa hangyo",
  },
  seniorMedReq1: {
    en: "Senior Citizen ID / OSCA ID (Valid and Active)",
    tl: "Senior Citizen ID / OSCA ID (Valid at Aktibo)",
    bis: "Senior Citizen ID / OSCA ID (Valid ug Aktibo)",
  },
  seniorMedReq2: {
    en: "Valid Government-issued ID with photo and signature",
    tl: "Valid Government-issued ID na may larawan at lagda",
    bis: "Valid nga Government-issued ID nga adunay litrato ug pirma",
  },
  seniorMedReq3: {
    en: "Recent 2×2 ID Picture (White background)",
    tl: "Kasalukuyang 2×2 ID Picture (White background)",
    bis: "Bag-ong 2×2 ID Picture (White background)",
  },
  seniorMedReq4: {
    en: "Barangay Certificate of Residency in Quezon City",
    tl: "Barangay Certificate of Residency sa Lungsod Quezon",
    bis: "Barangay Certificate of Residency sa Dakbayan sa Quezon",
  },
  seniorMedReq5: {
    en: "Copy of Medical Prescription or Doctor's Certificate",
    tl: "Kopya ng Medical Prescription o Doctor's Certificate",
    bis: "Kopya sa Medical Prescription o Doctor's Certificate",
  },
  seniorMovieReq1: {
    en: "Senior Citizen ID / OSCA ID (Valid and Active)",
    tl: "Senior Citizen ID / OSCA ID (Valid at Aktibo)",
    bis: "Senior Citizen ID / OSCA ID (Valid ug Aktibo)",
  },
  seniorMovieReq2: {
    en: "Valid Government-issued ID with photo and signature",
    tl: "Valid Government-issued ID na may larawan at lagda",
    bis: "Valid nga Government-issued ID nga adunay litrato ug pirma",
  },
  seniorMovieReq3: {
    en: "Recent 2×2 ID Picture (White background)",
    tl: "Kasalukuyang 2×2 ID Picture (White background)",
    bis: "Bag-ong 2×2 ID Picture (White background)",
  },
  seniorMovieReq4: {
    en: "Barangay Certificate of Residency in Quezon City",
    tl: "Barangay Certificate of Residency sa Lungsod Quezon",
    bis: "Barangay Certificate of Residency sa Dakbayan sa Quezon",
  },
  seniorLossReq1: {
    en: "Notarized Affidavit of Loss stating the loss of ID",
    tl: "Notarized Affidavit of Loss na nagsasaad ng pagkawala ng ID",
    bis: "Notarized Affidavit of Loss nga nagpahayag sa pagkawala sa ID",
  },
  seniorLossReq2: {
    en: "Valid Government-issued ID with photo and signature",
    tl: "Valid Government-issued ID na may larawan at lagda",
    bis: "Valid nga Government-issued ID nga adunay litrato ug pirma",
  },
  seniorRenewalReq1: {
    en: "Old / Expired Senior Citizen / OSCA ID",
    tl: "Lumang / Expired Senior Citizen / OSCA ID",
    bis: "Karaang / Expired nga Senior Citizen / OSCA ID",
  },
  seniorRenewalReq3: {
    en: "Barangay Certificate of Residency (if address changed)",
    tl: "Barangay Certificate of Residency (kung nagbago ang tirahan)",
    bis: "Barangay Certificate of Residency (kung nausab ang pinuy-anan)",
  },
  seniorRenewalReq4: {
    en: "Valid Government ID as additional identification",
    tl: "Valid Government ID bilang karagdagang pagkakakilanlan",
    bis: "Valid nga Government ID isip dugang pag-ila",
  },
  continueApplicationBtn: {
    en: "Continue Application",
    tl: "Ipagpatuloy ang Aplikasyon",
    bis: "Ipadayon ang Aplikasyon",
  },
  seniorSocialWorkerVisitNote: {
    en: "A social worker will contact you for verification and to schedule an appointment. Please bring all required documents when you visit.",
    tl: "Kokontakin ka ng isang social worker para sa beripikasyon at magtakda ng appointment. Mangyaring dalhin ang lahat ng kinakailangang dokumento sa iyong pagbisita.",
    bis: "Kontakon ka sa usa ka social worker para sa beripikasyon ug mag-iskedyul og appointment. Palihug dad-a ang tanang gikinahanglang dokumento sa imong pagbisita.",
  },

  // PWD Social Assistance Items
  pwdSocialReq1Title: { en: "Valid QC ID – PWD Sector", tl: "Valid QC ID – PWD Sector", bis: "Balido nga QC ID – PWD Sector" },
  pwdSocialReq1Desc: { en: "Clear copy or photo of your QCitizen ID (PWD sector)", tl: "Malinaw na kopya o litrato ng iyong QCitizen ID (PWD sector)", bis: "Tin-aw nga kopya o litrato sa imong QCitizen ID (PWD sector)" },
  pwdSocialReq2Title: { en: "Barangay Certificate of Indigency", tl: "Barangay Certificate of Indigency", bis: "Barangay Certificate of Indigency" },
  pwdSocialReq2Desc: { en: "Recent Certificate of Indigency from the Barangay Hall where you reside", tl: "Kamakailang Certificate of Indigency mula sa Barangay Hall kung saan nakatira", bis: "Bag-ong Certificate of Indigency gikan sa Barangay Hall diin nagpuyo" },
  pwdSocialReq3Title: { en: "Medical Certificate", tl: "Medical Certificate", bis: "Medical Certificate" },
  pwdSocialReq3Desc: { en: "Medical Certificate / Clinical Abstract from a licensed physician", tl: "Medical Certificate / Clinical Abstract mula sa lisensyadong manggagamot", bis: "Medical Certificate / Clinical Abstract gikan sa lisensyadong doktor" },
  pwdSocialReq4Title: { en: "2×2 Picture", tl: "2×2 Picture", bis: "2×2 nga Litrato" },
  pwdSocialReq4Desc: { en: "Whole-body photo with a calendar (if applicant is bedridden)", tl: "Whole-body picture na may kasamang kalendaryo (kung bedridden ang aplikante)", bis: "Whole-body nga litrato nga adunay kalendaryo (kung bedridden ang aplikante)" },

  // General PWD Items
  pwdGenReqResidence: { en: "Proof of Residence", tl: "Katibayan ng Paninirahan", bis: "Pamatuod sa Pagpuyo" },
  pwdGenReqResidenceDesc: { en: "Valid ID or Original Barangay Certificate", tl: "Valid ID o Orihinal na Barangay Certificate", bis: "Balido nga ID o Orihinal nga Barangay Certificate" },
  pwdGenReqPhoto: { en: "ID Picture (2x2)", tl: "Litrato ng ID (2x2)", bis: "Litrato sa ID (2x2)" },
  pwdGenReqPhotoDesc: { en: "With white background", tl: "May puting background", bis: "Adunay puti nga background" },
  pwdGenReqSignature: { en: "Signature", tl: "Lagda", bis: "Pirma" },
  pwdGenReqDisability: { en: "Proof of Disability", tl: "Katibayan ng Kapansanan", bis: "Pamatuod sa Kabakangan" },
  pwdGenReqDisabilityDesc: { en: "See Apparent / Non-Apparent Disability requirements below", tl: "Tingnan ang Apparent / Non-Apparent Disability requirements sa ibaba", bis: "Tan-awa ang Apparent / Non-Apparent Disability requirements sa ubos" },

  // Apparent / Non-Apparent PWD Items
  pwdApparentPhoto: { en: "Whole Body Picture", tl: "Buong Katawang Litrato", bis: "Tibuok Lawas nga Litrato" },
  pwdApparentPhotoDesc: { en: "Clear photo showing the disability", tl: "Malinaw na larawan na nagpapakita ng kapansanan", bis: "Tin-aw nga litrato nga nagpakita sa kabakangan" },
  pwdApparentXray: { en: "X-ray for Clients with Orthopedic Devices", tl: "X-ray para sa may Orthopedic Devices", bis: "X-ray para sa adunay Orthopedic Devices" },
  pwdApparentXrayDesc: { en: "Updated X-ray", tl: "Kamakailang X-ray", bis: "Bag-ong X-ray" },
  pwdNonApparentCert: { en: "Certificate of Disability from Specialist (Physician)", tl: "Certificate of Disability mula sa Espesyalistang Doktor", bis: "Certificate of Disability gikan sa Espesyalistang Doktor" },
  pwdNonApparentCertDesc: { en: "Annex 4, NCDA Administrative Order 001 S. 2021", tl: "Annex 4, NCDA Administrative Order 001 S. 2021", bis: "Annex 4, NCDA Administrative Order 001 S. 2021" },
  pwdNonApparentMedCert: { en: "Medical Certificate from the Specialist (Physician)", tl: "Medical Certificate mula sa Espesyalistang Doktor", bis: "Medical Certificate gikan sa Espesyalistang Doktor" },
  pwdNonApparentMedCertDesc: { en: "For cancer and rare diseases", tl: "Para sa cancer at mga pambihirang sakit", bis: "Para sa cancer ug talagsaong mga sakit" },

  // Senior Requirements
  seniorReq1: {
    en: "Fully Accomplished QCitizen ID Online Form or Request for Sectoral Status Change (if already a holder of regular resident/non-senior QC ID) in QC E-Services",
    tl: "Kumpletong QCitizen ID Online Form o Request for Sectoral Status Change (kung mayroon nang regular na QC ID) sa QC E-Services",
    bis: "Kumpleto nga QCitizen ID Online Form o Request for Sectoral Status Change (kung aduna nay regular nga QC ID) sa QC E-Services",
  },
  seniorReq2: {
    en: "Accomplished Application Form, submitted online through QC E-Services",
    tl: "Napunang Application Form, naisumite online sa pamamagitan ng QC E-Services",
    bis: "Nasudlan nga Application Form, naisumite online pinaagi sa QC E-Services",
  },
  seniorReq3: {
    en: "1 original and 1 photocopy of valid ID with applicant's birth date and address (if no QCitizen ID)",
    tl: "1 orihinal at 1 photocopy ng valid ID na may petsa ng kapanganakan at tirahan ng aplikante (kung walang QCitizen ID)",
    bis: "1 orihinal ug 1 photocopy sa balido nga ID nga adunay petsa sa pagkatawo ug adres sa aplikante (kung walay QCitizen ID)",
  },
  seniorReq4: {
    en: "1 original and 1 photocopy of Birth Certificate and Barangay Certificate of Residency (if there is no QC ID or the birthdate and address differ from the Valid ID)",
    tl: "1 orihinal at 1 photocopy ng Birth Certificate at Barangay Certificate of Residency (kung walang QC ID o magkaiba ang petsa ng kapanganakan at tirahan sa Valid ID)",
    bis: "1 orihinal ug 1 photocopy sa Birth Certificate ug Barangay Certificate of Residency (kung walay QC ID o magkalahi ang petsa sa pagkatawo ug adres sa Balido nga ID)",
  },
  seniorReq5: {
    en: "1 original and 1 photocopy of Marriage Certificate (if applicant is a married woman whose last name differs from the Valid ID)",
    tl: "1 orihinal at 1 photocopy ng Marriage Certificate (kung ang aplikante ay babaeng may asawa na iba ang apelyido sa Valid ID)",
    bis: "1 orihinal ug 1 photocopy sa Marriage Certificate (kung ang aplikante usa ka minyo nga babaye nga lahi ang apelyido sa Balido nga ID)",
  },
  seniorReq6: {
    en: "Latest digital or ID photo (2×2) – Colored with white background",
    tl: "Pinakabagong digital o ID picture (2×2) – May kulay at may puting background",
    bis: "Pinakabag-o nga digital o ID picture (2×2) – Adunay kolor ug puti nga background",
  },

  // Solo Parent & Child Welfare Modal Texts
  spReqModalTitleChildWelfare: { en: "Requirements for Child Welfare Application", tl: "Mga Kinakailangan sa Aplikasyon para sa Kapakanan ng Bata", bis: "Mga Kinahanglanon sa Aplikasyon para sa Kaayohan sa Bata" },
  spReqModalTitleRenewal: { en: "Requirements for Renewal of Solo Parent ID", tl: "Mga Kinakailangan sa Pag-renew ng Solo Parent ID", bis: "Mga Kinahanglanon sa Pag-renew sa Solo Parent ID" },
  spReqModalTitleLoss: { en: "Requirements for Replacement / Lost Solo Parent ID", tl: "Mga Kinakailangan para sa Nawala / Papalitang Solo Parent ID", bis: "Mga Kinahanglanon para sa Nawala / Ilisdan nga Solo Parent ID" },
  spReqModalTitleNew: { en: "Requirements for Solo Parent Application", tl: "Mga Kinakailangan sa Aplikasyon ng Solo Parent ID", bis: "Mga Kinahanglanon sa Aplikasyon sa Solo Parent ID" },
  spSubChildWelfare: { en: "Here is the document validity guide for Child Welfare.", tl: "Narito ang gabay sa validity ng dokumento para sa Kapakanan ng Bata.", bis: "Mao kini ang giya sa validity sa dokumento para sa Kaayohan sa Bata." },
  spSubRenewal: { en: "Required documents for renewing your Solo Parent ID.", tl: "Mga kinakailangang dokumento para sa pag-renew ng iyong Solo Parent ID.", bis: "Mga gikinahanglang dokumento para sa pag-renew sa imong Solo Parent ID." },
  spSubLoss: { en: "Required documents for lost Solo Parent ID.", tl: "Mga kinakailangang dokumento para sa nawalang Solo Parent ID.", bis: "Mga gikinahanglang dokumento para sa nawala nga Solo Parent ID." },
  spSubNew: { en: "Select the basis of your solo parent status to see the exact required documents.", tl: "Pumili ng batayan ng iyong solo parent status para makita ang eksaktong mga dokumentong kailangan.", bis: "Pilia ang basihan sa imong solo parent status para makita ang eksaktong mga dokumento nga gikinahanglan." },
  spChildWelfareAlert: { en: "Make sure all documents are valid and up-to-date before coming for verification or interview.", tl: "Siguraduhing valid at up-to-date ang lahat ng dokumento bago pumunta para sa verification o interview.", bis: "Siguroha nga balido ug bag-o ang tanang dokumento sa dili pa moadto para sa verification o interview." },
  spDocValidityHeading: { en: "Document Validity", tl: "Bisa ng Dokumento (Validity)", bis: "Bisa sa Dokumento (Validity)" },
  spRenewalHeading: { en: "Required Documents for Renewal:", tl: "Mga Kinakailangang Dokumento para sa Renewal:", bis: "Mga Gikinahanglang Dokumento para sa Renewal:" },
  spLossHeading: { en: "Required Documents for Replacement / Lost ID:", tl: "Mga Kinakailangang Dokumento para sa Nawala / Papalitang ID:", bis: "Mga Gikinahanglang Dokumento para sa Nawala / Ilisdan nga ID:" },
  spPrimaryHeading: { en: "Primary Required Documents:", tl: "Pangunahing mga Kinakailangang Dokumento:", bis: "Panguna nga mga Gikinahanglang Dokumento:" },
  spCategoryHint: { en: "💡 In Step 1 of the application form, you will select your specific category (1-12) for the corresponding document.", tl: "💡 Sa Step 1 ng application form, pipiliin mo ang iyong partikular na kategorya (1-12) para sa kaukulang dokumento.", bis: "💡 Sa Step 1 sa application form, imong pilion ang imong espesipikong kategorya (1-12) para sa angay nga dokumento." },
  spAppDetailsTitle: { en: "Application Details & Basis", tl: "Mga Detalye at Batayan ng Aplikasyon", bis: "Mga Detalye ug Basehan sa Aplikasyon" },
  spRecordVerificationTitle: { en: "Record Verification Details", tl: "Mga Detalye ng Pagpapatunay ng Rekord", bis: "Mga Detalye sa Pagmatuod sa Rekord" },

  seniorChecklistTitle: { en: "Service and Primary Requirements", tl: "Mga Kinakailangan sa Serbisyo at Pangunahing Kinakailangan", bis: "Mga Kinahanglanon sa Serbisyo ug Panguna nga Kinahanglanon" },
  seniorResidentCheck: { en: "Are you a bona fide resident of Quezon City?", tl: "Ikaw ba ay isang lehitimong residente ng Quezon City?", bis: "Ikaw ba usa ka lehitimong residente sa Quezon City?" },
  seniorAgeCheck: { en: "Are you sixty (60) years of age or older?", tl: "Ikaw ba ay animnapung (60) taong gulang o pataas?", bis: "Ikaw ba nag-edad og kan-uman (60) ka tuig o labaw pa?" },
  seniorDeclarationCheck: { en: "I declare that all information and documents submitted are true and correct.", tl: "Ipinapahayag ko na ang lahat ng impormasyon at dokumentong isinumite ay totoo at tama.", bis: "Gipahayag nako nga ang tanang impormasyon ug dokumento nga gisumite tinuod ug husto." },
  emergencyContactTitle: { en: "EMERGENCY CONTACT", tl: "EMERGENCY CONTACT", bis: "KONTAK PANG-EMERHENSIYA" },
  emergencyContactDesc: { en: "Person to call or contact in case of emergency.", tl: "Taong tatawagan o lalapitan sa panahon ng emergency.", bis: "Tawo nga tawagan o duolon sa panahon sa emerhensiya." },
  familySeniorTitle: { en: "FAMILY MEMBER SENIOR CITIZEN INFORMATION", tl: "IMPORMASYON NG KAPAMILYA (SENIOR CITIZEN)", bis: "IMPORMASYON SA PAMILYA (SENIOR CITIZEN)" },
  familyApplySeniorCheckbox: { en: "I am applying for my family member (e.g. parent / relative), not for myself", tl: "Nag-a-apply ako para sa aking kapamilya (hal. magulang / kamag-anak), hindi para sa sarili ko", bis: "Nag-apply ko para sa akong pamilya (pananglitan, ginikanan / paryente), dili para sa akong kaugalingon" },
  seniorAgeNotice: { en: "Notice: Senior Citizen ID is only for residents aged 60 years old and above.", tl: "Paunawa: Ang Senior Citizen ID ay para lamang sa mga residenteng may edad na 60 taong gulang pataas.", bis: "Pahibalo: Ang Senior Citizen ID para lamang sa mga residente nga nag-edad og 60 ka tuig pataas." },
  reviewBeforeSubmitTitle: { en: "Review Information Before Submitting", tl: "Suriin ang Impormasyon Bago Isumite", bis: "Susiha ang Impormasyon sa Dili pa Isumite" },
  reviewBeforeSubmitDesc: { en: "Please review all the information and documents you provided before submitting.", tl: "Pakisuyong suriin ang lahat ng inyong ibinigay na impormasyon at dokumento bago isumite.", bis: "Palihug susiha ang tanang impormasyon ug dokumento nga imong gihatag sa dili pa isumite." },
  applicationDetails: { en: "Application Details", tl: "Mga Detalye ng Aplikasyon", bis: "Mga Detalye sa Aplikasyon" },
  uploadedDocuments: { en: "Uploaded Documents", tl: "Mga Na-upload na Dokumento", bis: "Mga Na-upload nga Dokumento" },
  yearsOld: { en: "years old", tl: "taong gulang", bis: "ka tuig" },
  applicationTypeLabel: { en: "Application Type", tl: "Uri ng Aplikasyon", bis: "Matang sa Aplikasyon" },
  dateSubmittedLabel: { en: "Date Submitted", tl: "Petsa ng Pagsumite", bis: "Petsa sa Pagsumite" },
  appointmentRequestNotice: {
    en: "The date and time of your appointment will be set by the social worker after reviewing your application. You will receive an SMS and email notification.",
    tl: "Ang petsa at oras ng iyong appointment ay itatakda ng social worker matapos suriin ang iyong aplikasyon. Makakatanggap ka ng SMS at email notification.",
    bis: "Ang petsa ug oras sa imong appointment i-set sa social worker human masusi ang imong aplikasyon. Makadawat ka og SMS ug email notification."
  },
  termsAgreementNotice: {
    en: "By clicking \"SUBMIT APPLICATION\", you certify that all information submitted is true, correct, and complete according to the best of your knowledge.",
    tl: "Sa pag-click ng \"SUBMIT APPLICATION\", pinatutunayan mo na ang lahat ng impormasyong isinumite ay totoo, tama, at kumpleto ayon sa iyong kaalaman.",
    bis: "Sa pag-click sa \"SUBMIT APPLICATION\", gipamatud-an nimo nga ang tanang impormasyon nga gisumite tinuod, husto, ug kompleto sumala sa imong kahibalo."
  },
  submitApplicationUpper: { en: "SUBMIT APPLICATION", tl: "ISUMITE ANG APLIKASYON", bis: "ISUMITE ANG APLIKASYON" },
  submittingUpper: { en: "SUBMITTING...", tl: "ISINUSUMITE...", bis: "GISUMITE..." },
  applicationSubmittedSuccess: { en: "Application Submitted Successfully!", tl: "Matagumpay na Naisumite ang Aplikasyon!", bis: "Malamposong Naisumite ang Aplikasyon!" },
  trackingNumberNote: {
    en: "Your application has been received. Please save your Reference Number to track the status.",
    tl: "Natanggap na ang inyong aplikasyon. Pakitabi ang Reference Number upang masubaybayan ang estado nito.",
    bis: "Nadawat na ang imong aplikasyon. Palihug i-save ang Reference Number aron masubay ang estado niini."
  },
  trackApplicationBtn: { en: "Track Application", tl: "Subaybayan ang Aplikasyon", bis: "Subaya ang Aplikasyon" },
  backToServicesBtn: { en: "Back to Senior Services", tl: "Bumalik sa Serbisyong Senior", bis: "Balik sa Serbisyo sa Senior" },
  fieldsMarkedRequired: { en: "Fields marked with (*) are required", tl: "Ang mga field na may (*) ay kinakailangan", bis: "Ang mga field nga may (*) gikinahanglan" },
  autoFilledFromQcid: { en: "Auto-filled from QCID profile (Locked)", tl: "Awtomatikong kinuha mula sa profile ng QCID (Naka-lock)", bis: "Awtomatikong gikuha gikan sa profile sa QCID (Naka-lock)" },
  qcidVerifiedBadge: { en: "QCID Verified", tl: "Beripikadong QCID", bis: "Beripikadong QCID" },
  seniorRenewalChecklistTitle: { en: "RENEWAL OF SENIOR CITIZEN ID — PRIMARY REQUIREMENTS", tl: "PAG-RENEW NG SENIOR CITIZEN ID — PANGUNAHING KINAKAILANGAN", bis: "PAG-RENEW SA SENIOR CITIZEN ID — PANGUNANG KINAHANGLANON" },
  seniorLossChecklistTitle: { en: "REPLACEMENT / LOST SENIOR CITIZEN ID — PRIMARY REQUIREMENTS", tl: "PAGPAPALIT / NAWALANG SENIOR CITIZEN ID — PANGUNAHING KINAKAILANGAN", bis: "PAG-ILIS / NAWALA NGA SENIOR CITIZEN ID — PANGUNANG KINAHANGLANON" },
  seniorNoExistingIdCheck: { en: "Do you have no existing Senior Citizen / OSCA ID?", tl: "Wala ka pa bang umiiral na Senior Citizen / OSCA ID?", bis: "Wala pa ba kay naa nang daan nga Senior Citizen / OSCA ID?" },
  seniorHasExistingRenewalCheck: { en: "Do you have an existing or expired Senior Citizen / OSCA ID for renewal?", tl: "Mayroon ka bang umiiral o nag-expire na Senior Citizen / OSCA ID para sa renewal?", bis: "Naa ba kay naa nang daan o na-expire nga Senior Citizen / OSCA ID para sa renewal?" },
  seniorLostDamagedCheck: { en: "Was your Senior Citizen / OSCA ID lost or damaged, and in need of replacement?", tl: "Nawala o nasira ba ang inyong Senior Citizen / OSCA ID, at kailangan ng kapalit?", bis: "Nawala o nadaot ba ang imong Senior Citizen / OSCA ID, ug nagkinahanglan og puli?" },
  seniorOscaIdNumberLabel: { en: "Senior Citizen / OSCA ID Number", tl: "Senior Citizen / OSCA ID Number", bis: "Senior Citizen / OSCA ID Number" },
  seniorRecordFound: { en: "Senior Citizen Record Found", tl: "Nahanap ang Rekord ng Senior Citizen", bis: "Nakaplagan ang Rekord sa Senior Citizen" },
  enterExistingIdPlaceholder: { en: "Enter Existing ID Number", tl: "Ilagay ang Kasalukuyang ID Number", bis: "Isulat ang Naa nang ID Number" },
  verifyIdBtn: { en: "VERIFY ID", tl: "I-VERIFY ANG ID", bis: "I-VERIFY ANG ID" },
  verifyingBtn: { en: "Verifying...", tl: "Bineberipika...", bis: "Giberipika..." },
  reasonForRenewalLabel: { en: "Reason for Renewal *", tl: "Dahilan ng Pag-renew *", bis: "Rason sa Pag-renew *" },
  reasonForReplacementLabel: { en: "Reason for Replacement *", tl: "Dahilan ng Pagpapalit *", bis: "Rason sa Pag-ilis *" },
  expiredDueRenewal: { en: "Expired / Due for Renewal", tl: "Paso na / Para sa Pag-renew", bis: "Paso na / Para sa Pag-renew" },
  updatedInformation: { en: "Updated Information", tl: "Na-update na Impormasyon", bis: "Na-update nga Impormasyon" },
  lostOption: { en: "Lost / Nawala", tl: "Nawala", bis: "Nawala" },
  damagedOption: { en: "Damaged / Nasira", tl: "Nasira", bis: "Nadaot" },
  verifiedPersonalInfo: { en: "Verified Personal Information", tl: "Na-verify na Personal na Impormasyon", bis: "Na-verify nga Personal nga Impormasyon" },
  autoFilledFromQcidRecord: { en: "Auto-filled from QCID Record", tl: "Awtomatikong kinuha mula sa Rekord ng QCID", bis: "Awtomatikong gikuha gikan sa Rekord sa QCID" },
  fullAddressLabel: { en: "Complete Address", tl: "Kumpletong Tirahan", bis: "Kompleto nga Pinuy-anan" },
  reviewSeniorDesc: {
    en: "Please review your personal information from your QCID profile. Fill in the additional details below.",
    tl: "Pakisuri ang inyong personal na impormasyon mula sa QCID profile. Punan ang mga karagdagang detalye sa ibaba.",
    bis: "Palihug susiha ang imong personal nga impormasyon gikan sa QCID profile. Pun-i ang dugang detalye sa ubos."
  },
  autoFetchedFromVerifiedSeniorId: {
    en: "Information automatically retrieved from verified Senior Citizen ID ({id}).",
    tl: "Awtomatikong nakuha ang impormasyon mula sa na-verify na Senior Citizen ID ({id}).",
    bis: "Awtomatikong nakuha ang impormasyon gikan sa na-verify nga Senior Citizen ID ({id})."
  },
  selectBarangayOption: { en: "Select Barangay", tl: "Piliin ang Barangay", bis: "Pilia ang Barangay" },
  selectCivilStatusOption: { en: "Select Civil Status", tl: "Piliin ang Katayuang Sibil", bis: "Pilia ang Kahimtang Sibil" },
  selectRelationshipOption: { en: "Select Relationship", tl: "Piliin ang Relasyon", bis: "Pilia ang Relasyon" },
  relationRelative: { en: "Relative", tl: "Kamag-anak", bis: "Paryente" },
  relationCaregiver: { en: "Caregiver / Guardian", tl: "Tagapag-alaga / Guardian", bis: "Tig-atiman / Guardian" },
  relationFriend: { en: "Friend / Neighbor", tl: "Kaibigan / Kapitbahay", bis: "Higala / Silingan" },
  relationOthers: { en: "Others", tl: "Iba pa", bis: "Uban pa" },
  expiredOldSeniorId: { en: "Expired / Old Senior ID:", tl: "Paso / Lumang Senior ID:", bis: "Paso / Daang Senior ID:" },
  lostSeniorIdLabel: { en: "Lost Senior ID / QCID:", tl: "Nawalang Senior ID / QCID:", bis: "Nawala nga Senior ID / QCID:" },
  seniorLossIdAlert: {
    en: "For senior citizens whose ID was lost or damaged. Please complete the Notarized Affidavit of Loss and required documents for ID replacement.",
    tl: "Para sa mga nawalan o nasiraan ng Senior Citizen ID. Kumpletuhin ang Notarized Affidavit of Loss at mga kailangang dokumento para sa pagpapalit ng ID.",
    bis: "Para sa mga nawad-an o nadaot nga Senior Citizen ID. Kompletoha ang Notarized Affidavit of Loss ug mga gikinahanglang dokumento para sa pag-ilis sa ID."
  },
  reviewBeforeSubmission: { en: "Review Before Submission", tl: "Suriin Bago Isumite", bis: "Susiha sa Dili pa Isumite" },
  areYouSureSubmit: { en: "Are you sure you want to submit your application?", tl: "Sigurado ka ba na nais mong isumite ang iyong aplikasyon?", bis: "Sigurado ba ka nga gusto nimong isumite ang imong aplikasyon?" },
  checkAllInfoNotice: { en: "Please check all information and uploaded documents before submitting. You can still go back and make changes.", tl: "Pakisuri ang lahat ng impormasyon at na-upload na dokumento bago mag-submit. Maaari ka pang bumalik at magpalit.", bis: "Palihug susiha ang tanang impormasyon ug na-upload nga dokumento sa dili pa mag-submit. Mahimo pa kang mobalik ug mag-usab." },
  goBackEditBtn: { en: "← GO BACK & EDIT", tl: "← BUMALIK AT I-EDIT", bis: "← BALIK UG I-EDIT" },
  cancelBtnUpper: { en: "CANCEL", tl: "IKANSELA", bis: "IKANSELA" },
  yesSubmitBtn: { en: "YES, SUBMIT APPLICATION", tl: "OO, ISUMITE ANG APLIKASYON", bis: "OO, ISUMITE ANG APLIKASYON" },
  certifyTrueAndCorrect: { en: "I certify that all information provided is true and correct. *", tl: "Pinatutunayan ko na ang lahat ng impormasyong ibinigay ay totoo at tama. *", bis: "Gipamatud-an nako nga ang tanang impormasyon nga gihatag tinuod ug husto. *" },
  uploadFilesRequirementAlert: { en: "Please upload a file for every required document (*) before proceeding.", tl: "Kinakailangang mag-upload ng file para sa bawat kinakailangang dokumento (*) bago magpatuloy.", bis: "Kinahanglan mag-upload og file para sa matag gikinahanglan nga dokumento (*) sa dili pa magpadayon." },
  emergencyContactRequirementAlert: { en: "Please complete all required fields for emergency contact before proceeding.", tl: "Punan ang lahat ng kinakailangang field para sa emergency contact bago magpatuloy.", bis: "Pun-i ang tanang gikinahanglang field para sa emergency contact sa dili pa magpadayon." },
  familyMemberRequirementAlert: { en: "Please fill out all required fields for the family member and ensure the age is 60 years or older.", tl: "Punan ang lahat ng kinakailangang field para sa miyembro ng pamilya at tiyaking 60 taong gulang pataas ang edad.", bis: "Pun-i ang tanang gikinahanglang field para sa sakop sa pamilya ug siguroha nga 60 anyos pataas ang edad." },
  uploadFileBtnUpper: { en: "UPLOAD FILE", tl: "MAG-UPLOAD NG FILE", bis: "PAG-UPLOAD OG FILE" },
  cameraBtnUpper: { en: "CAMERA", tl: "KAMERA", bis: "KAMERA" },
  uploadedBadge: { en: "Uploaded", tl: "Na-upload na", bis: "Na-upload na" },
  requiredStar: { en: "Required *", tl: "Kailangan *", bis: "Gikinahanglan *" },
  optionalBadge: { en: "Optional", tl: "Opsyonal", bis: "Opsyonal" },
  notProvided: { en: "Not provided", tl: "Hindi naibigay", bis: "Wala gihatag" },
  filesAttached: { en: "file(s) attached", tl: "na-attach na file", bis: "na-attach nga file" },
  editLabel: { en: "Edit", tl: "I-edit", bis: "I-edit" },
  emergencyContactName: { en: "Emergency Contact Name", tl: "Pangalan ng Emergency Contact", bis: "Ngalan sa Emergency Contact" },
  emergencyContactNoLabel: { en: "Emergency Contact No.", tl: "Numero ng Emergency Contact", bis: "Numero sa Emergency Contact" },
  requiredDocInstruction: {
    en: "Upload the following required documents. You can upload images (JPG, PNG) or PDF, or capture using the Camera.",
    tl: "I-upload ang mga sumusunod na kinakailangang dokumento. Pwedeng mag-upload ng larawan (JPG, PNG) o PDF, o kumuha gamit ang Camera.",
    bis: "I-upload ang mga mosunod nga gikinahanglan nga dokumento. Mahimong mag-upload og hulagway (JPG, PNG) o PDF, o mokuha gamit ang Camera."
  },
  reqDocsNewSenior: { en: "Required Documents for New Application", tl: "Mga Kinakailangang Dokumento para sa Bagong Aplikasyon", bis: "Mga Gikinahanglang Dokumento para sa Bag-ong Aplikasyon" },
  reqDocsRenewalSenior: { en: "Required Documents for Senior ID Renewal", tl: "Mga Kinakailangang Dokumento para sa Pag-renew ng Senior ID", bis: "Mga Gikinahanglang Dokumento para sa Pag-renew sa Senior ID" },
  reqDocsLossSenior: { en: "Required Documents for Replacement of Lost Senior ID", tl: "Mga Kinakailangang Dokumento para sa Pagpapalit ng Nawalang Senior ID", bis: "Mga Gikinahanglang Dokumento para sa Pag-ilis sa Nawala nga Senior ID" },

  // ── Child Welfare Wizard ──
  cwStepChecklist: { en: "COMPLETE CHECKLIST", tl: "KUMPLETUHIN ANG CHECKLIST", bis: "KUMPLETOHA ANG CHECKLIST" },
  cwStepPersonal: { en: "PERSONAL INFORMATION", tl: "PERSONAL NA IMPORMASYON", bis: "PERSONAL NGA IMPORMASYON" },
  cwStepDocuments: { en: "SUBMIT DOCUMENTS", tl: "MAGSUMITE NG DOKUMENTO", bis: "ISUMITE ANG MGA DOKUMENTO" },
  cwStepReview: { en: "REVIEW & SUBMIT", tl: "SURIIN AT ISUMITE", bis: "SUSIHA UG ISUMITE" },
  serviceAndPrimaryRequirements: { en: "SERVICE AND PRIMARY REQUIREMENTS", tl: "MGA KINAKAILANGAN SA SERBISYO AT PANGUNAHING KINAKAILANGAN", bis: "MGA KINAHANGLANON SA SERBISYO UG PANGUNANG KINAHANGLANON" },
  childInfoTitle: { en: "I. CHILD INFORMATION", tl: "I. IMPORMASYON NG BATA", bis: "I. IMPORMASYON SA BATA" },
  childInfoDesc: { en: "Enter the complete details of the child beneficiary.", tl: "Ilagay ang buong detalye ng batang benepisyaryo.", bis: "Ibutang ang tibuok detalye sa bata nga benepisyaryo." },
  parentGuardianTitle: { en: "II. PARENT / GUARDIAN / REPORTING PERSON", tl: "II. MAGULANG / GUARDIAN / NAG-UULAT", bis: "II. GINIKANAN / GUARDIAN / TIG-REPORT" },
  parentGuardianDesc: { en: "Details of the parent, guardian, or reporting person.", tl: "Detalye ng magulang, guardian, o nag-uulat na indibidwal.", bis: "Detalye sa ginikanan, guardian, o tawo nga nag-report." },
  specificCaseDetailsTitle: { en: "III. SPECIFIC CASE DETAILS", tl: "III. TIYAK NA DETALYE NG KASO", bis: "III. ESPESIPIKONG DETALYE SA KASO" },
  submitAppTitle: { en: "Submit Application?", tl: "Isumite ang Aplikasyon?", bis: "Isumite ang Aplikasyon?" },
  submitAppDesc: { en: "Are you sure you want to submit your application for {program} ({type})?", tl: "Sigurado ka bang nais mong isumite ang inyong aplikasyon para sa {program} ({type})?", bis: "Sigurado ba ka nga gusto nimong isumite ang imong aplikasyon para sa {program} ({type})?" },
  appProcessingTitle: { en: "Processing your application...", tl: "Pinoproseso ang inyong Aplikasyon...", bis: "Giproseso ang imong Aplikasyon..." },
  appProcessingDesc: { en: "Submitting details to the Child Welfare Support Division.", tl: "Ipinapasa ang mga detalye sa Child Welfare Support Division.", bis: "Gipasa ang mga detalye sa Child Welfare Support Division." },
  cwSuccessTitle: { en: "Application Successfully Submitted!", tl: "Matagumpay na Naisumite ang Aplikasyon!", bis: "Malamposong Naisumite ang Aplikasyon!" },
  cwSuccessDesc: { en: "Your application for {program} has been received and is currently being reviewed by a Quezon City SSDD Social Worker.", tl: "Ang inyong aplikasyon para sa {program} ay natanggap na at kasalukuyang sinusuri ng Quezon City SSDD Social Worker.", bis: "Ang imong aplikasyon para sa {program} nadawat na ug kasamtangang gisusi sa Quezon City SSDD Social Worker." },
  cwPendingBadge: { en: "Pending Review", tl: "Kasalukuyang Sinusuri", bis: "Kasamtangang Gisusi" },
  trackPortalNotifDesc: { en: "You can track the status in your Portal Notifications and Activity History.", tl: "Maaari ninyong i-track ang status sa inyong Portal Notifications at Activity History.", bis: "Mahimo nimong masubay ang status sa imong Portal Notifications ug Activity History." },
  autoRedirectCountdown: { en: "Returning to form in {seconds} seconds...", tl: "Babalik sa aplikasyon sa loob ng {seconds} segundo...", bis: "Mobalik sa aplikasyon sulod sa {seconds} segundos..." },

  // ── Financial Aid Page ──
  financialAidOverviewTitle: { en: "Financial Aid Overview", tl: "Pangkalahatang-ideya ng Ayuda", bis: "Kinatibuk-ang Pagtan-aw sa Tabang Pinansyal" },
  financialAidSubtitle: { en: "Your approved financial assistance, designated amount, and City Hall payout appointment schedule are automatically recorded here.", tl: "Awtomatikong nakatala rito ang inyong naaprubahang ayuda, itinakdang halaga, at iskedyul ng payout appointment sa City Hall.", bis: "Awtomatikong nakatala dinhi ang imong naaprubahan nga tabang, gitakda nga kantidad, ug iskedyul sa payout appointment sa City Hall." },
  autoConnectNoticeTitle: { en: "Appointment & Financial Aid Automatically Connected", tl: "Awtomatikong Nakakabit ang Appointment at Ayuda", bis: "Awtomatikong Nakakonektar ang Appointment ug Tabang" },
  autoConnectNoticeDesc: { en: "No need to set the amount or resubmit. Once your application is approved by the Admin, the fixed amount and your Payout Appointment schedule will appear automatically.", tl: "Hindi na kailangan mag-set ng halaga o magsumite ulit. Kapag na-aprubahan ng Admin ang inyong aplikasyon, awtomatikong lalabas ang itinakdang Fixed Amount at ang petsa/oras ng inyong Payout Appointment.", bis: "Dili na kinahanglan mag-set og kantidad o magsumite pag-usab. Kung maaprobahan na sa Admin ang imong aplikasyon, awtomatikong mogawas ang gitakda nga Fixed Amount ug ang petsa/oras sa imong Payout Appointment." },
  myDisbursementsTitle: { en: "My Financial Aid & Payout Records ({count})", tl: "Aking mga Ayuda at Payout Record ({count})", bis: "Akong mga Tabang Pinansyal ug Payout Record ({count})" },
  noDisbursementsTitle: { en: "No Current Financial Aid Record", tl: "Walang Kasalukuyang Ayuda Record", bis: "Walay Kasamtangang Rekord sa Tabang" },
  noDisbursementsDesc: { en: "You have not submitted any financial assistance applications yet. Apply for Medical, Transportation, Food, or other AICS services to automatically track your disbursement here.", tl: "Wala ka pang naisusumiteng aplikasyon para sa ayuda. Mag-apply para sa Medical, Transportation, Food, o iba pang AICS serbisyo upang awtomatikong pumasok dito ang iyong disbursement record.", bis: "Wala pa kay nasumite nga aplikasyon para sa tabang. Mag-apply para sa Medical, Transportation, Food, o ubang serbisyo sa AICS aron awtomatikong mosulod dinhi ang imong rekord sa disbursement." },
  approvedFixedAmount: { en: "Approved Fixed Amount", tl: "Naaprubahang Halaga", bis: "Naaprubahan nga Kantidad" },
  payoutApptSchedule: { en: "Payout Appointment Schedule", tl: "Iskedyul ng Payout Appointment", bis: "Iskedyul sa Payout Appointment" },
  payoutLocationVenue: { en: "Payout Location / Venue", tl: "Lugar ng Payout / Venue", bis: "Lugar sa Payout / Venue" },
  financialAidStatusLabel: { en: "Financial Aid Status:", tl: "Katayuan ng Ayuda:", bis: "Kahimtang sa Tabang Pinansyal:" },
  step1PendingScheduled: { en: "Step 1: PENDING / SCHEDULED", tl: "Hakbang 1: PENDING / NAKAISKEDYUL", bis: "Lakang 1: PENDING / NAKAISKEDYUL" },
  step1PendingDesc: { en: "Go to City Hall on the scheduled day", tl: "Pumunta sa City Hall sa takdang araw", bis: "Adto sa City Hall sa gitakda nga adlaw" },
  step2Released: { en: "Step 2: RELEASED", tl: "Hakbang 2: NAILABAS NA (RELEASED)", bis: "Lakang 2: NAHATAG NA (RELEASED)" },
  step2ReleasedDesc: { en: "Financial aid has been disbursed", tl: "Naipagkaloob na ang ayuda", bis: "Nahatag na ang tabang pinansyal" },
  payoutReminderNotice: { en: "Appointment Reminder: Please bring your QCitizen ID or 1 Valid Government-issued ID along with original copies of your documents at the designated payout time.", tl: "Paalala sa Pagdalo sa Appointment: Dalhin ang inyong QCitizen ID o 1 Valid Government-issued ID kasama ang orihinal na kopya ng inyong mga dokumento sa takdang oras ng payout.", bis: "Pahinumdom sa Pagtambong sa Appointment: Dad-a ang imong QCitizen ID o 1 Balido nga Government ID uban ang orihinal nga kopya sa imong mga dokumento sa gitakda nga oras sa payout." },

  // ── History Applications ──
  myApplicationsTitle: { en: "Application History", tl: "Application History", bis: "Application History" },
  myApplicationsSubtitle: { en: "Track the status, schedule, and details of all your submitted social service requests.", tl: "Subaybayan ang estado, iskedyul, at detalye ng lahat ng inyong naisumiteng kahilingan sa serbisyong panlipunan.", bis: "Subaya ang estado, iskedyul, ug detalye sa tanan nimong nasumite nga hangyo sa serbisyo sosyal." },
  backToMyApplications: { en: "Back to Application History", tl: "Bumalik sa Application History", bis: "Balik sa Application History" },
  applicationDetailsTitle: { en: "Application Details", tl: "Mga Detalye ng Aplikasyon", bis: "Mga Detalye sa Aplikasyon" },
  searchApplicationsPlaceholder: { en: "Search application no., assistance, or name...", tl: "Maghanap ng application no., tulong, o pangalan...", bis: "Pangitaa ang application no., tabang, o ngalan..." },
  allApplicationsFilter: { en: "All Applications", tl: "Lahat ng Aplikasyon", bis: "Tanang Aplikasyon" },
  noApplicationsFound: { en: "No applications found.", tl: "Walang nahanap na aplikasyon.", bis: "Walay nakit-an nga aplikasyon." },
  applicantDetailsHeader: { en: "Applicant Details", tl: "Mga Detalye ng Aplikante", bis: "Mga Detalye sa Aplikante" },
  statusTimelineHeader: { en: "Status Timeline", tl: "Timeline ng Katayuan", bis: "Timeline sa Kahimtang" },

  // General & Form Keys
  pwdPersonalInfoHeader: { en: "Personal Information", tl: "Personal na Impormasyon", bis: "Personal nga Impormasyon" },
  pwdFieldRequiredNote: { en: "Fields marked with (*) are required", tl: "Ang mga field na may (*) ay kinakailangan", bis: "Ang mga field nga may (*) gikinahanglan" },
  qcidProfileDesc: { en: "Information auto-filled from your verified QCID profile.", tl: "Awtomatikong kinuha ang impormasyon mula sa inyong verified QCID profile.", bis: "Awtomatikong gikuha ang impormasyon gikan sa imong verified QCID profile." },
  autoFilledQcidBadge: { en: "Auto-filled from QCID", tl: "Awtomatikong kinuha sa QCID", bis: "Awtomatikong gikuha sa QCID" },
  childName: { en: "Child's Name", tl: "Pangalan ng Bata", bis: "Ngalan sa Bata" },
  parentGuardian: { en: "Parent / Guardian", tl: "Magulang / Guardian", bis: "Ginikanan / Guardian" },
  type: { en: "Type", tl: "Uri", bis: "Matang" },
  program: { en: "Program", tl: "Programa", bis: "Programa" },
  category: { en: "Category", tl: "Kategorya", bis: "Kategorya" },
  editInformation: { en: "Edit Information", tl: "I-edit ang Impormasyon", bis: "I-edit ang Impormasyon" },
  lockInformation: { en: "Lock Information", tl: "I-lock ang Impormasyon", bis: "I-lock ang Impormasyon" },

  // Notification Multi-language translations
  notifPwdApprovedTitle: {
    en: "PWD ID Application: Approved",
    tl: "Aplikasyon sa PWD ID: Naaprubahan",
    bis: "Aplikasyon sa PWD ID: Na-aprobahan",
  },
  notifPwdRenewalApprovedTitle: {
    en: "PWD ID Application (Renewal): Approved",
    tl: "Aplikasyon sa PWD ID (Renewal): Naaprubahan",
    bis: "Aplikasyon sa PWD ID (Renewal): Na-aprobahan",
  },
  notifPwdReplacementApprovedTitle: {
    en: "PWD ID Application (Replacement): Approved",
    tl: "Aplikasyon sa PWD ID (Replacement): Naaprubahan",
    bis: "Aplikasyon sa PWD ID (Replacement): Na-aprobahan",
  },
  notifPwdRejectedTitle: {
    en: "PWD ID Application: Not Approved",
    tl: "Aplikasyon sa PWD ID: Hindi Naaprubahan",
    bis: "Aplikasyon sa PWD ID: Wala Ma-aprobahan",
  },
  notifSeniorApprovedTitle: {
    en: "Senior Citizen ID Application: Approved",
    tl: "Aplikasyon sa Senior Citizen ID: Naaprubahan",
    bis: "Aplikasyon sa Senior Citizen ID: Na-aprobahan",
  },
  notifSeniorRenewalApprovedTitle: {
    en: "Senior Citizen ID Application (Renewal): Approved",
    tl: "Aplikasyon sa Senior Citizen ID (Renewal): Naaprubahan",
    bis: "Aplikasyon sa Senior Citizen ID (Renewal): Na-aprobahan",
  },
  notifSeniorReplacementApprovedTitle: {
    en: "Senior Citizen ID Application (Replacement): Approved",
    tl: "Aplikasyon sa Senior Citizen ID (Replacement): Naaprubahan",
    bis: "Aplikasyon sa Senior Citizen ID (Replacement): Na-aprobahan",
  },
  notifSeniorRejectedTitle: {
    en: "Senior Citizen ID Application: Not Approved",
    tl: "Aplikasyon sa Senior Citizen ID: Hindi Naaprubahan",
    bis: "Aplikasyon sa Senior Citizen ID: Wala Ma-aprobahan",
  },
  notifAicsApprovedTitle: {
    en: "AICS Assistance Application: Approved",
    tl: "Aplikasyon sa Tulong AICS: Naaprubahan",
    bis: "Aplikasyon sa Tabang AICS: Na-aprobahan",
  },
  notifAicsRejectedTitle: {
    en: "AICS Assistance Application: Not Approved",
    tl: "Aplikasyon sa Tulong AICS: Hindi Naaprubahan",
    bis: "Aplikasyon sa Tabang AICS: Wala Ma-aprobahan",
  },
  notifSoloParentApprovedTitle: {
    en: "Solo Parent Application: Approved",
    tl: "Aplikasyon sa Solo Parent: Naaprubahan",
    bis: "Aplikasyon sa Solo Parent: Na-aprobahan",
  },
  notifSoloParentRejectedTitle: {
    en: "Solo Parent Application: Not Approved",
    tl: "Aplikasyon sa Solo Parent: Hindi Naaprubahan",
    bis: "Aplikasyon sa Solo Parent: Wala Ma-aprobahan",
  },
  notifChildWelfareApprovedTitle: {
    en: "Child Welfare Application: Approved",
    tl: "Aplikasyon sa Child Welfare: Naaprubahan",
    bis: "Aplikasyon sa Child Welfare: Na-aprobahan",
  },
  notifChildWelfareRejectedTitle: {
    en: "Child Welfare Application: Not Approved",
    tl: "Aplikasyon sa Child Welfare: Hindi Naaprubahan",
    bis: "Aplikasyon sa Child Welfare: Wala Ma-aprobahan",
  },
  notifLivelihoodApprovedTitle: {
    en: "Livelihood & Training Application: Approved",
    tl: "Aplikasyon sa Livelihood & Training: Naaprubahan",
    bis: "Aplikasyon sa Livelihood & Training: Na-aprobahan",
  },
  notifLivelihoodRejectedTitle: {
    en: "Livelihood & Training Application: Not Approved",
    tl: "Aplikasyon sa Livelihood & Training: Hindi Naaprubahan",
    bis: "Aplikasyon sa Livelihood & Training: Wala Ma-aprobahan",
  },
  notifRejectionReasonLabel: {
    en: "Reason for Rejection",
    tl: "Rason ng Pagtanggi",
    bis: "Rason sa Pagsalikway",
  },
  notifNoDetails: {
    en: "No additional details available.",
    tl: "Walang karagdagang detalyeng nakasaad.",
    bis: "Walay dugang detalyeng gipahayag.",
  },
  notifDismiss: {
    en: "Dismiss notification",
    tl: "Alisin ang notification",
    bis: "Kuhaa ang pahibalo",
  },
  idVerificationErrorTitle: {
    en: "Invalid ID Number",
    tl: "Hindi Matanggap ang ID Number",
    bis: "Dili Madawat ang ID Number",
  },
  seniorIdExactLengthError: {
    en: "Senior Citizen ID Number must be exactly 16 digits.",
    tl: "Kulang o labis ang Senior Citizen ID Number. Dapat ay eksaktong 16 digits.",
    bis: "Kulang o sobra ang Senior Citizen ID Number. Kinahanglan eksaktong 16 digits.",
  },
  seniorIdNotFoundError: {
    en: "Senior Citizen ID was not found in the official records. Please verify the official ID Number received in your email or on your issued Senior ID card.",
    tl: "Hindi natagpuan ang Senior Citizen ID sa talaan. Pakisuri ang opisyal na ID Number na natanggap sa inyong email o na-isyung Senior ID card.",
    bis: "Wala makit-i ang Senior Citizen ID sa talaan. Palihug susiha ang opisyal nga ID Number nga nadawat sa inyong email o gi-isyu nga Senior ID card.",
  },
  seniorIdVerifyGeneralError: {
    en: "An error occurred while verifying the Senior ID. Please try again.",
    tl: "Nagkaroon ng aberya sa pagsusuri ng Senior ID. Pakisubukang muli.",
    bis: "Adunay problema sa pagsusi sa Senior ID. Palihug sulayi pag-usab.",
  },
  seniorIdRecordFound: {
    en: "Senior Citizen Record Found: {name}",
    tl: "Natagpuang Rekord ng Senior Citizen: {name}",
    bis: "Nakit-an nga Rekord sa Senior Citizen: {name}",
  },
  pwdIdExactLengthError: {
    en: "PWD ID Number must be exactly 16 digits.",
    tl: "Kulang o labis ang PWD ID Number. Dapat ay eksaktong 16 digits.",
    bis: "Kulang o sobra ang PWD ID Number. Kinahanglan eksaktong 16 digits.",
  },
  pwdIdNotFoundError: {
    en: "PWD ID was not found in the official records. Please verify the official ID Number received in your email or on your issued PWD ID card.",
    tl: "Hindi natagpuan ang PWD ID sa talaan. Pakisuri ang opisyal na ID Number na natanggap sa inyong email o na-isyung PWD ID card.",
    bis: "Wala makit-i ang PWD ID sa talaan. Palihug susiha ang opisyal nga ID Number nga nadawat sa inyong email o gi-isyu nga PWD ID card.",
  },
  bookletMismatchErrorTitle: {
    en: "Booklet Number Mismatch",
    tl: "Hindi Tugma ang Booklet Number",
    bis: "Dili Magkatukma ang Booklet Number",
  },
  bookletMismatchErrorDesc: {
    en: "The entered booklet number does not match the official booklet number on record. Please make sure they match exactly to proceed.",
    tl: "Ang inilagay na booklet number ay hindi tumutugma sa opisyal na na-generate sa inyong talaan. Pakitiyak na pareho ito bago magpatuloy.",
    bis: "Ang gisulod nga booklet number wala magkatukma sa opisyal nga na-generate sa inyong talaan. Palihug siguroha nga pareho kini aron makapadayon.",
  },
  bookletInvalidErrorDesc: {
    en: "Invalid Booklet Number. Please enter the correct 16-digit Booklet Number generated on your booklet.",
    tl: "Hindi valid ang Booklet Number. Pakilagay ang tamang 16-digit Booklet Number na na-generate sa inyong booklet.",
    bis: "Dili balido ang Booklet Number. Palihug isulod ang saktong 16-digit Booklet Number nga na-generate sa inyong booklet.",
  },
  bookletRequiredError: {
    en: "Please enter your existing {bookletType} Number.",
    tl: "Kailangang ilagay ang inyong existing {bookletType} Number.",
    bis: "Kinahanglan isulod ang inyong existing {bookletType} Number.",
  },
  seniorVerifyIdFirstForBooklet: {
    en: "Please verify your Senior Citizen / OSCA ID above first to check your official booklet record.",
    tl: "Pakiverify muna ang Senior Citizen / OSCA ID sa itaas upang masuri ang inyong opisyal na booklet record.",
    bis: "Palihug i-verify una ang Senior Citizen / OSCA ID sa ibabaw aron masusi ang inyong opisyal nga booklet record.",
  },
  seniorIdNumberPlaceholder: {
    en: "e.g. 137404-2026-XXXXXX",
    tl: "Hal. 137404-2026-XXXXXX",
    bis: "Pananglitan: 137404-2026-XXXXXX",
  },
  seniorMovieBookletPlaceholder: {
    en: "e.g. MV-2026-XXXXXX",
    tl: "Hal. MV-2026-XXXXXX",
    bis: "Pananglitan: MV-2026-XXXXXX",
  },
  seniorMedicineBookletPlaceholder: {
    en: "e.g. MB-2026-XXXXXX",
    tl: "Hal. MB-2026-XXXXXX",
    bis: "Pananglitan: MB-2026-XXXXXX",
  },
  seniorHouseholdSituationTitle: {
    en: "Household and Economic Situation",
    tl: "Kalagayan ng Sambahayan at Kabuhayan",
    bis: "Kahimtang sa Panimalay ug Panginabuhian",
  },
  seniorLivingArrangementLabel: {
    en: "Living Arrangement",
    tl: "Kaayusan sa Tirahan (Living Arrangement)",
    bis: "Kahikayan sa Puy-anan (Living Arrangement)",
  },
  seniorLivingAloneTitle: {
    en: "Alone",
    tl: "Alone (Mag-isa)",
    bis: "Alone (Nag-inusara)",
  },
  seniorLivingAloneDesc: {
    en: "Living alone in the household",
    tl: "Nakatira nang mag-isa sa tahanan",
    bis: "Nagpuyo nga nag-inusara sa panimalay",
  },
  seniorLivingFamilyTitle: {
    en: "With Family",
    tl: "With Family (Kasama ang Pamilya)",
    bis: "With Family (Uban ang Pamilya)",
  },
  seniorLivingFamilyDesc: {
    en: "Living with children, grandchildren, or spouse",
    tl: "Kasama ang mga anak, apo, o asawa",
    bis: "Kauban ang mga anak, apo, o kapikas",
  },
  seniorLivingCaregiverTitle: {
    en: "With Caregiver",
    tl: "With Caregiver (Kasama ang Tagapag-alaga)",
    bis: "With Caregiver (Uban ang Tig-atiman)",
  },
  seniorLivingCaregiverDesc: {
    en: "Has a caregiver taking care of daily needs",
    tl: "May tagapag-alaga na nag-aasikaso",
    bis: "Adunay tig-atiman nga nag-atiman",
  },
  seniorFamilyMembersCountLabel: {
    en: "Number of Household Members",
    tl: "Bilang ng Kasapi sa Bahay",
    bis: "Gidaghanon sa Miyembro sa Panimalay",
  },
  seniorMonthlyFamilyIncomeLabel: {
    en: "Monthly Family Income",
    tl: "Buwanang Kita ng Pamilya",
    bis: "Bulanang Kita sa Pamilya",
  },
  seniorIncomeNoIncome: {
    en: "No Regular Income",
    tl: "Walang Regular na Kita / No Income",
    bis: "Walay Regular nga Kita / No Income",
  },
  seniorIncomeBelow5k: {
    en: "Below ₱5,000",
    tl: "Mababang ₱5,000",
    bis: "Ubos sa ₱5,000",
  },
  seniorIncome5kTo10k: {
    en: "₱5,000 – ₱10,000",
    tl: "₱5,000 – ₱10,000",
    bis: "₱5,000 – ₱10,000",
  },
  seniorIncome10kTo20k: {
    en: "₱10,001 – ₱20,000",
    tl: "₱10,001 – ₱20,000",
    bis: "₱10,001 – ₱20,000",
  },
  seniorEmploymentPensionStatusLabel: {
    en: "Employment / Pension Status",
    tl: "Katayuan sa Trabaho / Pensyon",
    bis: "Kahimtang sa Trabaho / Pensyon",
  },
  seniorEmpRetired: {
    en: "Retired / Pensioner",
    tl: "Retired / Pensyonado",
    bis: "Retirado / Pensyonado",
  },
  seniorEmpUnemployed: {
    en: "Unemployed",
    tl: "Unemployed (Walang Trabaho)",
    bis: "Walay Trabaho (Unemployed)",
  },
  seniorEmpSelfEmployed: {
    en: "Self-employed / Small Business",
    tl: "Self-employed / Maliit na Negosyo",
    bis: "Self-employed / Gamay nga Negosyo",
  },
  seniorEmpPartTime: {
    en: "Part-time Worker",
    tl: "Part-time Worker",
    bis: "Part-time nga Trabahante",
  },
  seniorEmpEmployed: {
    en: "Employed",
    tl: "Employed (May Trabaho)",
    bis: "Adunay Trabaho (Employed)",
  },
  seniorSourceOfIncomeLabel: {
    en: "Source of Income / Pension",
    tl: "Pinagkukunan ng Kita / Pensyon",
    bis: "Gikuhanan sa Kita / Pensyon",
  },
  seniorSourceOfIncomePlaceholder: {
    en: "e.g. Small pension and assistance from relatives",
    tl: "Maliit na pensyon at tulong mula sa mga kamag-anak",
    bis: "Gamay nga pensyon ug tabang gikan sa mga paryente",
  },
  seniorPurposeOfAssistanceLabel: {
    en: "Reason and Purpose of Request",
    tl: "Dahilan at Layunin ng Kahilingan",
    bis: "Rason ug Katuyoan sa Hangyo",
  },
  seniorPurposeOfAssistancePlaceholder: {
    en: "e.g. Purchase of maintenance medicine for hypertension and diabetes, and daily living needs.",
    tl: "Pambili ng maintenance medicine para sa hypertension at diabetes, at pambayad sa pang-araw-araw na pangangailangan.",
    bis: "Ipalit og maintenance nga tambal para sa hypertension ug diabetes, ug inadlaw-adlaw nga panginahanglan.",
  },
  seniorFillAllRequiredFieldsError: {
    en: "Please fill in all required fields marked with a red asterisk (*).",
    tl: "Mangyaring punan ang lahat ng kinakailangang fields na may pulang asterisko (*).",
    bis: "Palihug pun-i ang tanang gikinahanglan nga fields nga adunay pulang asterisk (*).",
  },
  switchServiceConfirmWarning: {
    en: "Are you sure you want to switch services? Any unsaved information you entered will be lost.",
    tl: "Sigurado ka bang nais mong lumipat ng serbisyo? Mawawala ang kasalukuyang impormasyon na iyong sinasagutan.",
    bis: "Sigurado ka ba nga gusto nimong mobalhin og serbisyo? Mawala ang kasamtangang impormasyon nga imong gipangbutang.",
  },
  leavePageConfirmWarning: {
    en: "Are you sure you want to go back? Any unsaved information you entered will be lost.",
    tl: "Sigurado ka bang nais mong bumalik? Mawawala ang kasalukuyang impormasyon na iyong sinasagutan.",
    bis: "Sigurado ka ba nga gusto nimong mobalik? Mawala ang kasamtangang impormasyon nga imong gipangbutang.",
  },
  takePhotoCameraBtn: {
    en: "TAKE PHOTO (CAMERA)",
    tl: "KUMUHA NG LARAWAN (CAMERA)",
    bis: "KUHA OG LITRATO (CAMERA)",
  },
  uploadPhotoBtn: {
    en: "UPLOAD PHOTO",
    tl: "MAG-UPLOAD NG LARAWAN",
    bis: "PAG-UPLOAD OG LITRATO",
  },
  allowedFileTypesCameraNote: {
    en: "Allowed file types: JPG, JPEG, PNG, WEBP (or capture using Camera)",
    tl: "Allowed file types: JPG, JPEG, PNG, WEBP (o kumuha gamit ang Camera)",
    bis: "Gitugotan nga mga file: JPG, JPEG, PNG, WEBP (o pagkuha gamit ang Camera)",
  },
  allowedFileTypesCameraPdfNote: {
    en: "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (or capture using Camera)",
    tl: "Allowed file types: JPG, JPEG, PNG, WEBP, PDF (o kumuha gamit ang Camera)",
    bis: "Gitugotan nga mga file: JPG, JPEG, PNG, WEBP, PDF (o pagkuha gamit ang Camera)",
  },
  cameraModalTitle: {
    en: "Take Photo (Camera)",
    tl: "Kumuha ng Larawan (Camera)",
    bis: "Kuha og Litrato (Camera)",
  },
  openingCamera: {
    en: "Opening camera...",
    tl: "Binubuksan ang camera...",
    bis: "Giablihan ang camera...",
  },
  switchCamera: {
    en: "Switch Camera",
    tl: "Palitan ang Camera",
    bis: "Ilisi ang Camera",
  },
  retakePhoto: {
    en: "Retake Photo",
    tl: "Ulitin (Retake)",
    bis: "Usba ang Pagkuha",
  },
  usePhoto: {
    en: "Use Photo",
    tl: "Gamitin ang Larawan",
    bis: "Gamita ang Litrato",
  },
  cancelModalBtn: {
    en: "Cancel",
    tl: "Kanselahin",
    bis: "Kanselahon",
  },
  takePhotoAction: {
    en: "Take Photo",
    tl: "Kumuha ng Larawan",
    bis: "Kuha og Litrato",
  },
  docSeniorOscaIdTitle: {
    en: "SENIOR CITIZEN ID / OSCA ID",
    tl: "SENIOR CITIZEN ID / OSCA ID",
    bis: "SENIOR CITIZEN ID / OSCA ID",
  },
  docSeniorOscaIdDesc: {
    en: "Clear copy of your OSCA / QC Senior Citizen ID (front and back).",
    tl: "Malinaw na kopya ng inyong OSCA / QC Senior Citizen ID (harapan at likod).",
    bis: "Klaro nga kopya sa inyong OSCA / QC Senior Citizen ID (atubangan ug luyo).",
  },
  docValidGovIdTitle: {
    en: "VALID GOVERNMENT-ISSUED ID",
    tl: "VALID GOVERNMENT-ISSUED ID",
    bis: "VALID NGA GOBYERNO NGA ID",
  },
  docValidGovIdDesc: {
    en: "Passport, UMID, Driver's License, Postal ID, or Voter's Certificate.",
    tl: "Passport, UMID, Driver's License, Postal ID, o Voter's Certificate.",
    bis: "Passport, UMID, Driver's License, Postal ID, o Voter's Certificate.",
  },
  docBarangayIndigencyTitle: {
    en: "BARANGAY CERTIFICATE OF RESIDENCY OR INDIGENCY",
    tl: "BARANGAY CERTIFICATE OF RESIDENCY O INDIGENCY",
    bis: "BARANGAY CERTIFICATE OF RESIDENCY O INDIGENCY",
  },
  docBarangayIndigencyDesc: {
    en: "Proof of residency or Certificate of Indigency from your barangay.",
    tl: "Katibayan ng paninirahan o indigency mula sa inyong barangay.",
    bis: "Pamatuod sa pagpuyo o indigency gikan sa inyong barangay.",
  },
  docIdPhotoTitle: {
    en: "2×2 OR RECENT ID PICTURE",
    tl: "2×2 O RECENT ID PICTURE",
    bis: "2×2 O BAG-ONG ID PICTURE",
  },
  docIdPhotoDesc: {
    en: "Recent 2x2 ID picture with a white background.",
    tl: "Kamakailang 2x2 ID picture na may puting background.",
    bis: "Bag-ong 2x2 ID picture nga adunay puti nga background.",
  },
  docProofOfIncomeTitle: {
    en: "PROOF OF INCOME (IF AVAILABLE)",
    tl: "PROOF OF INCOME (KUNG MAYROON)",
    bis: "PROOF OF INCOME (KUNG NAA)",
  },
  docProofOfIncomeDesc: {
    en: "Certificate of Indigency, Pension Voucher, or payslip if with regular pension.",
    tl: "Certificate of Indigency, Pension Voucher, o payslip kung may regular na pensyon.",
    bis: "Certificate of Indigency, Pension Voucher, o payslip kung adunay regular nga pensyon.",
  },
  docMedicalPrescriptionTitle: {
    en: "MEDICAL CERTIFICATE / PRESCRIPTION (IF MEDICAL-RELATED)",
    tl: "MEDICAL CERTIFICATE / RESETA (KUNG MEDICAL-RELATED)",
    bis: "MEDICAL CERTIFICATE / RESETA (KUNG MEDICAL-RELATED)",
  },
  docMedicalPrescriptionDesc: {
    en: "Medical abstract, doctor's prescription, or hospital bill if request is medical-related.",
    tl: "Medical abstract, reseta ng doktor, o hospital bill kung medikal ang hinihiling.",
    bis: "Medical abstract, reseta sa doktor, o hospital bill kung medikal ang gipangayo.",
  },
  docOtherDocsTitle: {
    en: "OTHER SUPPORTING DOCUMENTS (OPTIONAL)",
    tl: "OTHER SUPPORTING DOCUMENTS (OPTIONAL)",
    bis: "UBAN PANG MGA DOKUMENTO (OPTIONAL)",
  },
  docOtherDocsDesc: {
    en: "Other proof or documents supporting your application.",
    tl: "Iba pang katibayan o dokumento na sumusuporta sa inyong aplikasyon.",
    bis: "Uban pang pamatuod o dokumento nga nagsuporta sa inyong aplikasyon.",
  },
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string, vars?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const LANGUAGE_ORDER: Language[] = ["en", "tl", "bis"]

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("appLanguage") : null
    return stored === "tl" || stored === "bis" ? stored : "en"
  })

  const updateLanguage = (lang: Language) => {
    setLanguage(lang)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("appLanguage", lang)
    }
  }

  const toggleLanguage = () => {
    const nextIndex = (LANGUAGE_ORDER.indexOf(language) + 1) % LANGUAGE_ORDER.length
    updateLanguage(LANGUAGE_ORDER[nextIndex])
  }

  const t = (key: string, vars?: Record<string, string>) => {
    const entry = translations[key]
    let text = entry ? entry[language] : key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, v)
      }
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider")
  return ctx
}
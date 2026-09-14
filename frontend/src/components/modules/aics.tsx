import { useState, useEffect, useCallback } from 'react'
import { API_BASE as APP_API_BASE } from '../../config/api'
import { getSavedProfilePhoto } from '../../utils/profilePhoto'
import { FIXED_ASSISTANCE_AMOUNTS } from '../../utils/financialAidSync'

const API_BASE = `${APP_API_BASE}/api/aics`



const DESIGN = {
  colors: {
    primary: 'var(--color-primary, hsl(221, 83%, 53%))',
    canvas: 'var(--color-background, hsl(220, 25%, 98%))',
    foreground: 'var(--color-foreground, hsl(222, 47%, 11%))',
    card: 'var(--color-card, #ffffff)',
    sidebar: 'var(--color-sidebar, hsl(222, 47%, 11%))',
    muted: 'var(--color-muted, hsl(220, 14%, 95%))',
    border: 'var(--color-border, hsl(220, 13%, 91%))',
  },
  fonts: {
    body: '"Inter", system-ui, -apple-system, sans-serif',
    heading: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  },
  radius: {
    base: '16px',
    card: '12px',
    lg: '8px',
  },
}

// ---- Types galing sa backend (aics_applications / aics_documents tables) ----
type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'completed'

interface AicsDocument {
  id: number
  document_label: string
  original_filename: string
  file_path?: string
  file_type: string
  uploaded_at: string
}

interface AicsApplication {
  id: number
  reference_no: string
  assistance_type: string
  qc_id: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  nationality: string | null
  birth_date: string | null
  age: string | null
  gender: string | null
  civil_status: string | null
  phone: string | null
  email: string | null
  address: string | null
  details: Record<string, any> | null
  status: ApplicationStatus
  created_at: string
  updated_at: string
}

function getAppSuffix(app: AicsApplication | null | undefined): string {
  if (!app) return ''
  if (app.suffix && app.suffix.trim() && app.suffix !== '—') return app.suffix.trim()
  if ((app.details as any)?.suffix) return String((app.details as any).suffix).trim()
  if ((app.details as any)?.applicantSuffix) return String((app.details as any).applicantSuffix).trim()

  try {
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('userProfile') || localStorage.getItem('user')
    if (raw) {
      const u = JSON.parse(raw)
      const uQcid = u.qcidNumber || u.qcid_number || u.qcidNo || u.qcid || u.reference_number
      const uEmail = u.email
      if (
        (uQcid && (uQcid === app.qc_id || uQcid === app.reference_no)) ||
        (uEmail && app.email && uEmail.toLowerCase() === app.email.toLowerCase()) ||
        (u.lastName && app.last_name && u.lastName.toLowerCase() === app.last_name.toLowerCase())
      ) {
        if (u.suffix && u.suffix.trim()) return u.suffix.trim()
      }
    }
  } catch {}

  return ''
}

function fullName(app: AicsApplication) {
  const suffix = getAppSuffix(app)
  const parts = [app.first_name, app.middle_name, app.last_name]
  if (suffix && !app.last_name?.toLowerCase().endsWith(suffix.toLowerCase())) {
    parts.push(suffix)
  }
  return parts.filter(Boolean).join(' ')
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return dateStr
  }
}

export default function AICS() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin-review'>('dashboard')

  const [applications, setApplications] = useState<AicsApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [reviewingApp, setReviewingApp] = useState<AicsApplication | null>(null)
  const [reviewingDocs, setReviewingDocs] = useState<AicsDocument[]>([])
  const [viewingDoc, setViewingDoc] = useState<AicsDocument | null>(null)
  const [showInformantInfo, setShowInformantInfo] = useState(false)
  const [showDeceasedInfo, setShowDeceasedInfo] = useState(false)  
  const [showBeneficiaryInfo, setShowBeneficiaryInfo] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchApplications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_BASE}/applications`)
      if (!res.ok) throw new Error('Failed to fetch applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch (err) {
      console.error(err)
      if (!silent) {
        setErrorMsg('Hindi makuha ang listahan ng applications. Siguraduhing tumatakbo ang backend server.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications(false)

    // Realtime live polling every 2 seconds
    const interval = setInterval(() => {
      fetchApplications(true)
    }, 2000)

    const handleSync = () => {
      fetchApplications(true)
    }

    window.addEventListener('storage', handleSync)
    window.addEventListener('aics_application_submitted', handleSync)
    window.addEventListener('focus', handleSync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('aics_application_submitted', handleSync)
      window.removeEventListener('focus', handleSync)
    }
  }, [fetchApplications])

  const openReview = async (app: AicsApplication) => {
    setActionLoading(true)
    setReviewingApp(app)
    setCurrentView('admin-review')
    try {
      const targetIdentifier = app.id ? String(app.id) : encodeURIComponent(app.reference_no || app.qc_id || '')
      const res = await fetch(`${API_BASE}/applications/${targetIdentifier}`)
      if (res.ok) {
        const data = await res.json()
        if (data.application) {
          setReviewingApp(data.application)
        }
        setReviewingDocs(data.documents || [])
      }
    } catch (err) {
      console.error('Error fetching application details:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const updateStatus = async (status: ApplicationStatus) => {
    if (!reviewingApp) return
    setActionLoading(true)
    try {
      const res = await fetch(`${API_BASE}/applications/${reviewingApp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')

      if (status === 'approved') {
        try {
          const rawConcern = (reviewingApp.assistance_type || 'Medical').replace(/\s*assistance/gi, '').trim()
          const formattedConcern = rawConcern.charAt(0).toUpperCase() + rawConcern.slice(1) + ' Assistance'
          const fixedAmt = FIXED_ASSISTANCE_AMOUNTS[formattedConcern] || FIXED_ASSISTANCE_AMOUNTS[reviewingApp.assistance_type] || 5000
          const qcid = reviewingApp.qc_id || reviewingApp.reference_no || '110000116932100'
          const appName = fullName(reviewingApp).toUpperCase()

          // Add to all_financial_disbursements
          const rawDisb = localStorage.getItem('all_financial_disbursements')
          const currentDisb = rawDisb ? JSON.parse(rawDisb) : []
          const appDisbId = `aics-disb-${reviewingApp.id}`

          if (!currentDisb.some((d: any) => d.id === appDisbId)) {
            currentDisb.unshift({
              id: appDisbId,
              disbursementId: `DISB-2026-${String(reviewingApp.id).padStart(4, '0')}`,
              applicationRef: qcid,
              applicantName: appName,
              assistanceType: formattedConcern,
              fixedAmount: fixedAmt,
              dateApproved: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: 'PENDING',
              venue: 'Quezon City Hall',
              remarks: 'Awtomatikong pumasok mula sa naaprubahang AICS aplikasyon.',
            })
            localStorage.setItem('all_financial_disbursements', JSON.stringify(currentDisb))
          }
        } catch (e) {
          console.warn('Could not auto-register AICS disbursement:', e)
        }
      }

      window.dispatchEvent(new Event('aics_applications_updated'))
      window.dispatchEvent(new Event('applications_updated'))
      window.dispatchEvent(new Event('appointments_updated'))
      window.dispatchEvent(new Event('financial_disbursements_updated'))
      window.dispatchEvent(new Event('storage'))

      alert(
        status === 'approved'
          ? ` Application from ${fullName(reviewingApp)} has been APPROVED!`
          : ` Application from ${fullName(reviewingApp)} has been REJECTED!`
      )

      setReviewingApp(null)
      setReviewingDocs([])
      setCurrentView('dashboard')
      fetchApplications()
    } catch (err) {
      console.error(err)
      alert('May error sa pag-update ng status. Pakisubukan ulit.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const labelStyle = {
    color: DESIGN.colors.foreground,
    opacity: 0.6,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  }

  const pendingCount = applications.filter((a) => a.status === 'pending').length
  const approvedCount = applications.filter((a) => a.status === 'approved' || a.status === 'completed').length

  // DASHBOARD VIEW
  if (currentView === 'dashboard') {
    return (
      <div style={{ backgroundColor: DESIGN.colors.canvas, minHeight: '100%' }} className="py-8">
        <style>{`
          body { font-family: ${DESIGN.fonts.body}; }
          h1, h2, h3, h4, h5, h6 { font-family: ${DESIGN.fonts.heading}; font-weight: 600; }
        `}</style>

        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h1 style={{ color: DESIGN.colors.foreground, fontSize: '30px', fontWeight: 700 }} className="font-heading">
              Assistance to Individual In Crisis
            </h1>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm">{errorMsg}</div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card }} className="p-6 shadow-sm">
              <h3 style={{ color: DESIGN.colors.foreground, opacity: 0.6, fontSize: '14px', fontWeight: 500 }}>Total applications</h3>
              <p style={{ color: DESIGN.colors.foreground, fontSize: '30px', fontWeight: 700, marginTop: '8px' }}>{applications.length}</p>
            </div>
            <div style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card }} className="p-6 shadow-sm">
              <h3 style={{ color: DESIGN.colors.foreground, opacity: 0.6, fontSize: '14px', fontWeight: 500 }}>Pending review</h3>
              <p style={{ color: DESIGN.colors.foreground, fontSize: '30px', fontWeight: 700, marginTop: '8px' }}>{pendingCount}</p>
            </div>
            <div style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card }} className="p-6 shadow-sm">
              <h3 style={{ color: DESIGN.colors.foreground, opacity: 0.6, fontSize: '14px', fontWeight: 500 }}>Approved</h3>
              <p style={{ color: DESIGN.colors.foreground, fontSize: '30px', fontWeight: 700, marginTop: '8px' }}>{approvedCount}</p>
            </div>
          </div>

          {/* Applications table */}
          <div style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card }} className="p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ color: DESIGN.colors.foreground, fontSize: '18px', fontWeight: 600 }}>All applications</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottomColor: DESIGN.colors.border }} className="border-b">
                    <th style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600 }} className="text-left py-3 px-4">Reference No.</th>
                    <th style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600 }} className="text-left py-3 px-4">Applicant</th>
                    <th style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600 }} className="text-left py-3 px-4">Assistance type</th>
                    <th style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600 }} className="text-left py-3 px-4">Date filed</th>
                    <th style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600 }} className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => openReview(app)}
                      style={{ borderBottomColor: DESIGN.colors.border, cursor: 'pointer' }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td style={{ color: DESIGN.colors.foreground, opacity: 0.7, fontSize: '13px', fontFamily: 'monospace' }} className="py-3 px-4">{app.qc_id || app.reference_no}</td>
                      <td style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 500 }} className="py-3 px-4">{fullName(app)}</td>
                      <td style={{ color: DESIGN.colors.foreground, opacity: 0.7, fontSize: '14px' }} className="py-3 px-4">{app.assistance_type}</td>
                      <td style={{ color: DESIGN.colors.foreground, opacity: 0.7, fontSize: '14px' }} className="py-3 px-4">{formatDate(app.created_at)}</td>
                      <td className="py-3 px-4">
                        <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px', padding: '4px 12px' }} className={getStatusColor(app.status)}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {applications.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-gray-400">
                        No applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ADMIN REVIEW VIEW
  if (currentView === 'admin-review' && reviewingApp) {
    const details = reviewingApp.details || {}

    return (
      <div style={{ backgroundColor: DESIGN.colors.canvas, minHeight: '100vh' }} className="py-8">
        <style>{`
          body { font-family: ${DESIGN.fonts.body}; }
          h1, h2, h3, h4, h5, h6 { font-family: ${DESIGN.fonts.heading}; font-weight: 600; }
        `}</style>

        <div className="max-w-4xl mx-auto px-4">
          <div style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card, overflow: 'hidden' }} className="shadow-sm">
            <div style={{ backgroundColor: DESIGN.colors.primary, color: 'white', padding: '32px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700 }} className="font-heading">Admin Review Portal</h1>
              <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '8px' }}>Review and approve/reject assistance applications</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                <div className="space-y-6">
                        <div style={{ borderLeftColor: DESIGN.colors.primary }} className="border-l-4 pl-4 flex items-center gap-4">
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', backgroundColor: DESIGN.colors.muted, border: `1px solid ${DESIGN.colors.border}` }} className="flex items-center justify-center">
                            {getSavedProfilePhoto(reviewingApp.qc_id) ? (
                              <img src={getSavedProfilePhoto(reviewingApp.qc_id)!} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '18px', fontWeight: 700, color: DESIGN.colors.primary }}>
                                {reviewingApp.first_name?.charAt(0)}{reviewingApp.last_name?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <label style={labelStyle}>Applicant Name</label>
                            <p style={{ color: DESIGN.colors.foreground, fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{fullName(reviewingApp)}</p>
                          </div>
                        </div>
                  <div>
                    <label style={labelStyle}>Assistance Type</label>
                    <p style={{ backgroundColor: DESIGN.colors.muted, borderRadius: DESIGN.radius.lg, padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: DESIGN.colors.foreground, marginTop: '8px' }}>{reviewingApp.assistance_type}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Reference No.</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', marginTop: '8px' }}>{reviewingApp.qc_id || reviewingApp.reference_no}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Date Applied</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{formatDate(reviewingApp.created_at)}</p>
                    </div>
                  </div>

                  <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t grid grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>QC ID Number</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.qc_id || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Nationality</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.nationality || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Suffix</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{getAppSuffix(reviewingApp) || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Birth Date</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.birth_date || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Age</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.age || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Gender</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.gender || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Civil Status</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.civil_status || '—'}</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.phone || '—'}</p>
                    </div>
                  </div>

                  <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t">
                    <label style={labelStyle}>Complete Address</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>{reviewingApp.address || '—'}</p>
                  </div>

                          {details.informantRelation && (
                              <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t">                              
                                  <button
                                    type="button"
                                    onClick={() => setShowInformantInfo(true)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: DESIGN.colors.primary,
                                      background: 'none',
                                      border: `1px solid ${DESIGN.colors.primary}`,
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    View Informant Information
                                  </button>
                                
                              </div>
                            )}
                                            {details.deceasedFirstName && (
                  <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowDeceasedInfo(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700,
                        color: DESIGN.colors.primary, background: 'none', border: `1px solid ${DESIGN.colors.primary}`,
                        borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                      }}
                    >
                       View Deceased Information
                    </button>
                  </div>
                )}

                {details.beneficiaryFirstName && (
                  <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowBeneficiaryInfo(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700,
                        color: DESIGN.colors.primary, background: 'none', border: `1px solid ${DESIGN.colors.primary}`,
                        borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                      }}
                      >
                       View Beneficiary Information
                    </button>
                  </div>
                )}
                    <div style={{ borderTopColor: DESIGN.colors.border }} className="pt-4 border-t">
                      <label style={labelStyle}>Uploaded Documents ({reviewingDocs.length})</label>
                      {reviewingDocs.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '8px' }}>
                          {reviewingDocs.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setViewingDoc(doc)}
                              style={{ display: 'block', textAlign: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
                            >
                              {doc.file_type?.startsWith('image/') ? (
                                <img
                                  src={`${API_BASE}/documents/${doc.id}/file`}
                                  alt={doc.document_label}
                                  style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${DESIGN.colors.border}` }}
                                />
                              ) : (
                                <div style={{ width: '100%', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: DESIGN.colors.muted, borderRadius: '8px' }}>📄</div>
                              )}
                              <p style={{ fontSize: '11px', color: DESIGN.colors.foreground, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_label}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: DESIGN.colors.foreground, fontSize: '13px', opacity: 0.5, marginTop: '8px' }}>No documents recorded.</p>
                      )}
                    </div>
                </div>
              </div>


                            {/* Actions */}
              <div style={{ borderTopColor: DESIGN.colors.border }} className="mt-8 pt-8 border-t flex gap-4">
                    <button
                          onClick={() => updateStatus('approved')}
                          disabled={actionLoading || reviewingApp.status !== 'pending'}
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: DESIGN.radius.card,
                            fontSize: '14px',
                            fontWeight: 600,
                            padding: '16px 24px',
                            flex: 1,
                            opacity: (actionLoading || reviewingApp.status !== 'pending') ? 0.5 : 1,
                            cursor: reviewingApp.status !== 'pending' ? 'not-allowed' : 'pointer',
                          }}
                          className="hover:opacity-90 transition transform hover:scale-105"
                        >
                          ✓ Approve Application
                        </button>
                        <button
                          onClick={() => updateStatus('rejected')}
                          disabled={actionLoading || reviewingApp.status !== 'pending'}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: DESIGN.radius.card,
                            fontSize: '14px',
                            fontWeight: 600,
                            padding: '16px 24px',
                            flex: 1,
                            opacity: (actionLoading || reviewingApp.status !== 'pending') ? 0.5 : 1,
                            cursor: reviewingApp.status !== 'pending' ? 'not-allowed' : 'pointer',
                          }}
                          className="hover:opacity-90 transition transform hover:scale-105"
                        >
                          ✕ Reject Application
                    </button>
                <button
                  onClick={() => {
                    setCurrentView('dashboard')
                    setReviewingApp(null)
                    setReviewingDocs([])
                  }}
                  style={{
                    backgroundColor: DESIGN.colors.muted,
                    color: DESIGN.colors.foreground,
                    borderRadius: DESIGN.radius.card,
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '16px 24px',
                    flex: 1,
                  }}
                  className="hover:opacity-80 transition"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewingDoc && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setViewingDoc(null)}
          >
            <div
              style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card, maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: DESIGN.colors.foreground }}>{viewingDoc.document_label}</h3>
                <button
                  onClick={() => setViewingDoc(null)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: DESIGN.colors.foreground, opacity: 0.6, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '20px', overflow: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewingDoc.file_type?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(viewingDoc.original_filename || '') ? (
                    <img
                      src={`${API_BASE}/documents/${viewingDoc.id}/file`}
                      alt={viewingDoc.document_label}
                      onError={(e) => {
                        const lbl = (viewingDoc.document_label || '').toLowerCase();
                        let fb = '/samples/sample_valid_id.png';
                        if (lbl.includes('indigen')) fb = '/samples/BARANGAY CERTIFICATE OF INDIGENCY.jpg';
                        else if (lbl.includes('barangay')) fb = '/samples/BARANGAY CERTIFICATE.webp';
                        else if (lbl.includes('medical')) fb = '/samples/MEDICAL CERTIFICATE.jpg';
                        else if (lbl.includes('death')) fb = '/samples/sample_death_certificate.png';
                        else if (lbl.includes('burial')) fb = '/samples/sample_burial_contract.png';
                        else if (lbl.includes('birth') || lbl.includes('psa')) fb = '/samples/BIRTH CERTIFICATE OF MINOR.jpg';
                        else if (lbl.includes('reseta')) fb = '/samples/RESETA NG GAMOT.jpg';
                        (e.currentTarget as HTMLImageElement).src = fb;
                      }}
                      style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px', objectFit: 'contain' }}
                    />
                  ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                    <p style={{ fontSize: '13px', color: DESIGN.colors.foreground, opacity: 0.7, marginBottom: '16px' }}>
                      Hindi ma-preview ang file type na ito sa browser. ({viewingDoc.original_filename})
                    </p>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {viewingDoc.id && (
            <a
              href={`${API_BASE}/documents/${viewingDoc.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: DESIGN.radius.lg, backgroundColor: DESIGN.colors.muted, color: DESIGN.colors.foreground, fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
            >
              Open in new tab
            </a>
          )}
          <button
            onClick={() => setViewingDoc(null)}
            style={{ padding: '10px 20px', borderRadius: DESIGN.radius.lg, backgroundColor: DESIGN.colors.primary, color: 'white', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>

        </div>
      </div>
    </div>
        )}
              {showInformantInfo && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowInformantInfo(false)}
        >
          <div
            style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card, maxWidth: '480px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: DESIGN.colors.foreground }}>Informant Information</h3>
              <button
                onClick={() => setShowInformantInfo(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: DESIGN.colors.foreground, opacity: 0.6, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Relasyon sa Pasyente</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantRelation || '—'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Buong Pangalan</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
                    {[details.informantFirstName, details.informantMiddleName, details.informantLastName].filter(Boolean).join(' ') || '—'}
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantGender || '—'}</p>
                </div>
                <div>
                  <label style={labelStyle}>Age</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantAge || '—'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Birth Date</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantBirthDate || '—'}</p>
                </div>
                                <div>
                  <label style={labelStyle}>House/Building number</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantHouseNumber || '—'}</p>
                </div>
                <div>
                  <label style={labelStyle}>Street name</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantStreetName || '—'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Barangay</label>
                  <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.informantBarangay || '—'}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowInformantInfo(false)}
                style={{ padding: '10px 20px', borderRadius: DESIGN.radius.lg, backgroundColor: DESIGN.colors.primary, color: 'white', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
              {showDeceasedInfo && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowDeceasedInfo(false)}
          >
            <div
              style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card, maxWidth: '480px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: DESIGN.colors.foreground }}>Deceased Information</h3>
                <button onClick={() => setShowDeceasedInfo(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: DESIGN.colors.foreground, opacity: 0.6, lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Buong Pangalan</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
                      {[details.deceasedFirstName, details.deceasedMiddleName, details.deceasedLastName].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedGender || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Age</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedAge || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Birth Date</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedBirthDate || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Death Date</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedDeathDate || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>House/Building number</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedHouseNumber || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Street name</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedStreetName || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Barangay</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.deceasedBarangay || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Cremation/Burial</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.cremationOrBurial || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Place of Death</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.placeOfDeath || '—'}</p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDeceasedInfo(false)} style={{ padding: '10px 20px', borderRadius: DESIGN.radius.lg, backgroundColor: DESIGN.colors.primary, color: 'white', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {showBeneficiaryInfo && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowBeneficiaryInfo(false)}
          >
            <div
              style={{ backgroundColor: DESIGN.colors.card, borderRadius: DESIGN.radius.card, maxWidth: '480px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: DESIGN.colors.foreground }}>Beneficiary Information</h3>
                <button onClick={() => setShowBeneficiaryInfo(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: DESIGN.colors.foreground, opacity: 0.6, lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Relasyon sa Benepisyaryo</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryRelation || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Buong Pangalan</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
                      {[details.beneficiaryFirstName, details.beneficiaryMiddleName, details.beneficiaryLastName].filter(Boolean).join(' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryGender || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Age</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryAge || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Birth Date</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryBirthDate || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Disability Type</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.disabilityType || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>School Name</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.schoolName || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>House/Building number</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryHouseNumber || '—'}</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Street name</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryStreetName || '—'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Barangay</label>
                    <p style={{ color: DESIGN.colors.foreground, fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>{details.beneficiaryBarangay || '—'}</p>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderTop: `1px solid ${DESIGN.colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowBeneficiaryInfo(false)} style={{ padding: '10px 20px', borderRadius: DESIGN.radius.lg, backgroundColor: DESIGN.colors.primary, color: 'white', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
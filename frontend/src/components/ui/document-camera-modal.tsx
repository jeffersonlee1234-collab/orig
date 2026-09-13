import { useEffect, useRef, useState } from "react"
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react"
import { useLanguage } from "./language-context"

interface DocumentCameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File, dataUrl?: string) => void
  docTitle?: string
}

export default function DocumentCameraModal({
  isOpen,
  onClose,
  onCapture,
  docTitle = "Dokumento",
}: DocumentCameraModalProps) {
  const { t } = useLanguage()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraError, setCameraError] = useState<string>("")
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [isLoadingCamera, setIsLoadingCamera] = useState(false)

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const startCamera = async (mode: "environment" | "user") => {
    stopStream()
    setCameraError("")
    setIsLoadingCamera(true)
    setCapturedPhotoUrl(null)
    setCapturedBlob(null)

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        })
      } catch {
        // Fallback if environment facingMode fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setIsLoadingCamera(false)
    } catch (err: any) {
      console.error("Camera access error:", err)
      setCameraError(
        t("cameraAccessError") ||
          "Hindi ma-access ang camera. Pakitiyak na pinapayagan ang camera permission sa inyong browser."
      )
      setIsLoadingCamera(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode)
    } else {
      stopStream()
      if (capturedPhotoUrl) {
        URL.revokeObjectURL(capturedPhotoUrl)
      }
      setCapturedPhotoUrl(null)
      setCapturedBlob(null)
    }
    return () => stopStream()
  }, [isOpen])

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedBlob(blob)
        setCapturedPhotoUrl(URL.createObjectURL(blob))
        stopStream()
      },
      "image/jpeg",
      0.9
    )
  }

  const handleRetake = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl)
    }
    setCapturedPhotoUrl(null)
    setCapturedBlob(null)
    startCamera(facingMode)
  }

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return
    const sanitizedTitle = docTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)
    const file = new File([capturedBlob], `${sanitizedTitle}_${Date.now()}.jpg`, {
      type: "image/jpeg",
    })

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64Url = (reader.result as string) || ""
      onCapture(file, base64Url)
      onClose()
    }
    reader.readAsDataURL(capturedBlob)
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-border cursor-default"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-foreground">{t("cameraModalTitle") || "Kumuha ng Larawan (Camera)"}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                {docTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera or Preview Viewport */}
        <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Captured preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading Indicator */}
          {isLoadingCamera && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>{t("openingCamera") || "Binubuksan ang camera..."}</span>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="absolute inset-x-4 top-4 bg-red-600/90 text-white text-xs p-3 rounded-xl flex items-start gap-2 backdrop-blur-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Flip camera button */}
          {!capturedPhotoUrl && !cameraError && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-xs cursor-pointer"
              title={t("switchCamera") || "Palitan ang Camera"}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-border flex items-center justify-between gap-3">
          {capturedPhotoUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-white transition-colors cursor-pointer"
              >
                {t("retakePhoto") || "Ulitin (Retake)"}
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                {t("usePhoto") || "Gamitin ang Larawan"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {t("cancelModalBtn") || "Kanselahin"}
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={Boolean(cameraError) || isLoadingCamera}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                {t("takePhotoAction") || "Kumuha ng Larawan"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

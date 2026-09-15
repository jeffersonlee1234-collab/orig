import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo)
  }

  public handleReload = () => {
    sessionStorage.removeItem("page_has_been_force_refreshed")
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] w-full items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {this.props.fallbackTitle || "Something went wrong"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {this.state.error?.message || "An unexpected error occurred while rendering this view."}
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

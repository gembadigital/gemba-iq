import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Application render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
          <div className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl shadow-sm p-6">
            <h1 className="text-lg font-bold text-rose-700 mb-2">Application Error</h1>
            <p className="text-sm text-slate-600 mb-4">
              The application failed to render. Details are shown below.
            </p>
            <pre className="text-xs bg-rose-50 text-rose-800 p-3 rounded-lg overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.assign("/login")}
              className="mt-4 px-4 py-2 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

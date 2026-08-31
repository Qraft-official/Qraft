"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: string | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error.message : "予期しないエラー" };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-2xl font-black text-aha">Qraft</p>
        <p className="mt-3 text-sm text-muted">画面の読み込みで問題が起きました。</p>
        <p className="mt-2 max-w-sm text-[11px] text-red-400">{this.state.error}</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            window.location.replace("/");
          }}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
        >
          トップへ戻る
        </button>
      </div>
    );
  }
}

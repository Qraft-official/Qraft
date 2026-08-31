import "react";

declare global {
  interface Window {
    mathVirtualKeyboard?: {
      show: (opts?: { animate?: boolean }) => void;
      hide: () => void;
      layouts: unknown;
      container: HTMLElement | null;
    };
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

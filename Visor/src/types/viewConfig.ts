import type { ReactNode } from "react";

export type TimedView = {
  id: string;
  type: "timed";
  durationMs: number;
  render: ReactNode;
};

export type ControlledView = {
  id: string;
  type: "controlled";

  render: (
    onComplete: () => void,
    isActive: boolean,
  ) => ReactNode;
};

export type ViewConfig =
  | TimedView
  | ControlledView;
import { create } from "zustand";

interface ControlState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  reset: boolean;
}

export const useControlStore = create<ControlState>(() => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
  reset: false,
}));

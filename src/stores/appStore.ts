import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AppEndpoint } from "@/utils/tauri";
import platformAdapter from "@/utils/platformAdapter";

const ENDPOINT_CHANGE_EVENT = "endpoint-changed";

export interface IServer {
  id: string;
  name: string;
  endpoint: string;
  provider: {
    icon: string;
  };
  enabled: boolean;
  public: boolean;
  profile?: any;
  available?: boolean;
  health?: {
    status: string;
  };
  assistantCount?: number;
  minimal_client_version?: {
    number: number;
  };
}

export type IAppStore = {
  showTooltip: boolean;
  setShowTooltip: (showTooltip: boolean) => void;

  error: string;
  setError: (message: any) => void;

  ssoRequestID: string;
  setSSORequestID: (ssoRequestID: string) => void;

  // ssoServerID: string;
  // setSSOServerID: (ssoServerID: string) => void,

  endpoint: AppEndpoint;
  endpoint_http: string;
  endpoint_websocket: string;
  setEndpoint: (endpoint: AppEndpoint) => void;
  language: string;
  setLanguage: (language: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  initializeListeners: () => void;

  showCocoShortcuts: string[];
  setShowCocoShortcuts: (showCocoShortcuts: string[]) => void;

  visible: boolean;
  withVisibility: <T>(fn: () => Promise<T>) => Promise<T>;
};

export const useAppStore = create<IAppStore>()(
  persist(
    (set) => ({
      showTooltip: true,
      setShowTooltip: (showTooltip: boolean) => set({ showTooltip }),
      error: "",
      setError: (message: any) => set({ error: message as string }),
      ssoRequestID: "",
      setSSORequestID: (ssoRequestID: string) => set({ ssoRequestID }),
      //  ssoServerID: "",
      // setSSOServerID: (ssoServerID: string) => set({ ssoServerID }),
      endpoint: "https://coco.infini.cloud/",
      endpoint_http: "https://coco.infini.cloud",
      endpoint_websocket: "wss://coco.infini.cloud/ws",
      setEndpoint: async (endpoint: AppEndpoint) => {
        const endpoint_http = endpoint;

        const withoutProtocol = endpoint.split("//")[1];

        const endpoint_websocket = endpoint?.includes("https")
          ? `wss://${withoutProtocol}/ws`
          : `ws://${withoutProtocol}/ws`;

        set({
          endpoint,
          endpoint_http,
          endpoint_websocket,
        });

        await platformAdapter.emitEvent(ENDPOINT_CHANGE_EVENT, {
          endpoint,
          endpoint_http,
          endpoint_websocket,
        });
      },
      language: "en",
      setLanguage: (language: string) => set({ language }),
      isPinned: false,
      setIsPinned: (isPinned: boolean) => set({ isPinned }),
      initializeListeners: () => {
        platformAdapter.listenEvent(ENDPOINT_CHANGE_EVENT, (event: any) => {
          const { endpoint, endpoint_http, endpoint_websocket } = event.payload;
          set({ endpoint, endpoint_http, endpoint_websocket });
        });
      },
      showCocoShortcuts: [],
      setShowCocoShortcuts: (showCocoShortcuts: string[]) => {
        console.log("set showCocoShortcuts", showCocoShortcuts);

        return set({ showCocoShortcuts });
      },
      visible: false,
      withVisibility: async <T>(fn: () => Promise<T>) => {
        set({ visible: true });

        const result = await fn();

        set({ visible: false });

        return result;
      },
    }),
    {
      name: "app-store",
      partialize: (state) => ({
        showTooltip: state.showTooltip,
        ssoRequestID: state.ssoRequestID,
        // ssoServerID: state.ssoServerID,
        error: state.error,
        endpoint: state.endpoint,
        endpoint_http: state.endpoint_http,
        endpoint_websocket: state.endpoint_websocket,
        language: state.language,
      }),
    }
  )
);

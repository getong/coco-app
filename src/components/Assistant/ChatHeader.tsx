import {
  MessageSquarePlus,
  ChevronDownIcon,
  Settings,
  RefreshCw,
  Check,
  Server,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useKeyPress } from "ahooks";

import logoImg from "@/assets/icon.svg";
import HistoryIcon from "@/icons/History";
import PinOffIcon from "@/icons/PinOff";
import PinIcon from "@/icons/Pin";
import ServerIcon from "@/icons/Server";
import WindowsFullIcon from "@/icons/WindowsFull";
import { useAppStore, IServer } from "@/stores/appStore";
import { useChatStore } from "@/stores/chatStore";
import type { Chat } from "./types";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import VisibleKey from "../Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { HISTORY_PANEL_ID } from "@/constants";

interface ChatHeaderProps {
  onCreateNewChat: () => void;
  onOpenChatAI: () => void;
  setIsSidebarOpen: () => void;
  isSidebarOpen: boolean;
  activeChat: Chat | undefined;
  reconnect: (server?: IServer) => void;
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  isChatPage?: boolean;
  showChatHistory?: boolean;
}

export function ChatHeader({
  onCreateNewChat,
  onOpenChatAI,
  isSidebarOpen,
  setIsSidebarOpen,
  activeChat,
  reconnect,
  isLogin,
  setIsLogin,
  isChatPage = false,
  showChatHistory = true,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const isPinned = useAppStore((state) => state.isPinned);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const { setMessages } = useChatStore();

  const [serverList, setServerList] = useState<IServer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentService = useConnectStore((state) => state.currentService);
  const setCurrentService = useConnectStore((state) => state.setCurrentService);

  const isTauri = useAppStore((state) => state.isTauri);
  const historicalRecords = useShortcutsStore((state) => {
    return state.historicalRecords;
  });
  const newSession = useShortcutsStore((state) => {
    return state.newSession;
  });
  const fixedWindow = useShortcutsStore((state) => {
    return state.fixedWindow;
  });
  const serviceList = useShortcutsStore((state) => state.serviceList);
  const external = useShortcutsStore((state) => state.external);
  const serverListButtonRef = useRef<HTMLButtonElement>(null);

  const fetchServers = useCallback(
    async (resetSelection: boolean) => {
      platformAdapter
        .commands("list_coco_servers")
        .then((res: any) => {
          const enabledServers = (res as IServer[]).filter(
            (server) => server.enabled !== false
          );
          //console.log("list_coco_servers", enabledServers);
          setServerList(enabledServers);

          if (resetSelection && enabledServers.length > 0) {
            const currentServiceExists = enabledServers.find(
              (server) => server.id === currentService?.id
            );

            if (currentServiceExists) {
              switchServer(currentServiceExists);
            } else {
              switchServer(enabledServers[enabledServers.length - 1]);
            }
          }
        })
        .catch((err: any) => {
          console.error(err);
        });
    },
    [currentService?.id]
  );

  useEffect(() => {
    isTauri && fetchServers(true);

    const unlisten = platformAdapter.listenEvent("login_or_logout", (event) => {
      console.log("Login or Logout:", currentService, event.payload);
      if (event.payload !== isLogin) {
        setIsLogin(!!event.payload);
      }
      fetchServers(true);
    });

    return () => {
      // Cleanup logic if needed
      unlisten.then((fn) => fn());
    };
  }, []);

  const switchServer = async (server: IServer) => {
    if (!server) return;
    try {
      // Switch UI first, then switch server connection
      setCurrentService(server);
      setEndpoint(server.endpoint);
      setMessages(""); // Clear previous messages
      onCreateNewChat();
      //
      if (!server.public && !server.profile) {
        setIsLogin(false);
        return;
      }
      setIsLogin(true);
      // The Rust backend will automatically disconnect,
      // so we don't need to handle disconnection on the frontend
      // src-tauri/src/server/websocket.rs
      reconnect && reconnect(server);
    } catch (error) {
      console.error("switchServer:", error);
    }
  };

  const togglePin = async () => {
    try {
      const newPinned = !isPinned;
      await platformAdapter.setAlwaysOnTop(newPinned);
      setIsPinned(newPinned);
    } catch (err) {
      console.error("Failed to toggle window pin state:", err);
      setIsPinned(isPinned);
    }
  };

  const openSettings = async () => {
    platformAdapter.emitEvent("open_settings", "connect");
  };

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    const isOpen = serverListButtonRef.current?.dataset["open"] != null;
    const length = serverList.length;

    if (!isOpen || length <= 1) return;

    const currentIndex = serverList.findIndex((server) => {
      return server.id === currentService?.id;
    });

    let nextIndex = currentIndex;

    if (key === "uparrow") {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : length - 1;
    } else if (key === "downarrow") {
      nextIndex = currentIndex < serverList.length - 1 ? currentIndex + 1 : 0;
    }

    switchServer(serverList[nextIndex]);
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchServers(false);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header
      className="flex items-center justify-between py-2 px-3"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        {showChatHistory && (
          <button
            data-sidebar-button
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen();
            }}
            aria-controls={isSidebarOpen ? HISTORY_PANEL_ID : void 0}
            className="py-1 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <VisibleKey
              shortcut={historicalRecords}
              onKeyPress={setIsSidebarOpen}
            >
              <HistoryIcon className="h-4 w-4" />
            </VisibleKey>
          </button>
        )}

        <Menu>
          <MenuButton className="px-2 flex items-center gap-1 rounded-full bg-white dark:bg-[#202126] p-1 text-sm/6 font-semibold text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">
            <img
              src={logoImg}
              className="w-4 h-4"
              alt={t("assistant.message.logo")}
            />
            Coco AI
            {showChatHistory && isTauri ? (
              <ChevronDownIcon className="size-4 text-gray-500 dark:text-gray-400" />
            ) : null}
          </MenuButton>

          {showChatHistory && isTauri ? (
            <MenuItems
              transition
              anchor="bottom end"
              className="w-28 origin-top-right rounded-xl bg-white dark:bg-[#202126] p-1 text-sm/6 text-gray-800 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <MenuItem>
                <button className="group flex w-full items-center gap-2 rounded-lg py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <img
                    src={logoImg}
                    className="w-4 h-4"
                    alt={t("assistant.message.logo")}
                  />
                  Coco AI
                </button>
              </MenuItem>
            </MenuItems>
          ) : null}
        </Menu>

        {showChatHistory ? (
          <button
            onClick={onCreateNewChat}
            className="p-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <VisibleKey shortcut={newSession} onKeyPress={onCreateNewChat}>
              <MessageSquarePlus className="h-4 w-4 relative top-0.5" />
            </VisibleKey>
          </button>
        ) : null}
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {activeChat?._source?.title ||
            activeChat?._source?.message ||
            activeChat?._id}
        </h2>
      </div>

      {isTauri ? (
        <div className="flex items-center gap-2">
          <button
            onClick={togglePin}
            className={clsx("inline-flex", {
              "text-blue-500": isPinned,
            })}
          >
            <VisibleKey shortcut={fixedWindow} onKeyPress={togglePin}>
              {isPinned ? <PinIcon /> : <PinOffIcon />}
            </VisibleKey>
          </button>

          <Popover className="relative">
            <PopoverButton
              ref={serverListButtonRef}
              className="flex items-center"
            >
              <VisibleKey
                shortcut={serviceList}
                onKeyPress={() => {
                  serverListButtonRef.current?.click();
                }}
              >
                <ServerIcon />
              </VisibleKey>
            </PopoverButton>

            <PopoverPanel className="absolute right-0 z-10 mt-2 min-w-[240px] bg-white dark:bg-[#202126] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3 whitespace-nowrap">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Servers
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openSettings}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                      <VisibleKey shortcut=",">
                        <Settings className="h-4 w-4 text-[#0287FF]" />
                      </VisibleKey>
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                      disabled={isRefreshing}
                    >
                      <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                        <RefreshCw
                          className={`h-4 w-4 text-[#0287FF] transition-transform duration-1000 ${
                            isRefreshing ? "animate-spin" : ""
                          }`}
                        />
                      </VisibleKey>
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {serverList.length > 0 ? (
                    serverList.map((server) => (
                      <div
                        key={server.id}
                        onClick={() => switchServer(server)}
                        className={`w-full flex items-center justify-between gap-1 p-2 rounded-lg transition-colors whitespace-nowrap ${
                          currentService?.id === server.id
                            ? "bg-gray-100 dark:bg-gray-800"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <img
                            src={server?.provider?.icon || logoImg}
                            alt={server.name}
                            className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800"
                          />
                          <div className="text-left flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                              {server.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              AI Assistant: {server.assistantCount || 1}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              server.health?.status
                                ? `bg-[${server.health?.status}]`
                                : "bg-gray-400 dark:bg-gray-600"
                            }`}
                          />
                          <div className="size-4 flex justify-end">
                            {currentService?.id === server.id && (
                              <VisibleKey
                                shortcut="↓↑"
                                shortcutClassName="w-6 -translate-x-4"
                              >
                                <Check className="w-full h-full text-gray-500 dark:text-gray-400" />
                              </VisibleKey>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Server className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("assistant.chat.noServers")}
                      </p>
                      <button
                        onClick={openSettings}
                        className="mt-2 text-xs text-[#0287FF] hover:underline"
                      >
                        {t("assistant.chat.addServer")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </PopoverPanel>
          </Popover>

          {isChatPage ? null : (
            <button className="inline-flex" onClick={onOpenChatAI}>
              <VisibleKey shortcut={external} onKeyPress={onOpenChatAI}>
                <WindowsFullIcon className="rotate-30 scale-x-[-1]" />
              </VisibleKey>
            </button>
          )}
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}

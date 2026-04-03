import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "gt-notifications-enabled";

function getStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function useNotifications() {
  const [enabled, setEnabledState] = useState(getStored);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // Request permission on first enable
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (enabled && permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, [enabled, permission]);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // localStorage may be unavailable
    }
    if (val && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  const sendNotification = useCallback(
    (title: string, body?: string, options?: NotificationOptions) => {
      if (!enabled) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      // Don't notify if tab is focused
      if (document.hasFocus()) return;

      const n = new Notification(title, { body, icon: "/favicon.ico", ...options });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    },
    [enabled]
  );

  return { enabled, setEnabled, permission, sendNotification };
}

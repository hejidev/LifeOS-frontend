"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getSocket } from "@/lib/socket";

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => api.get("/notifications").then((d) => d.notifications), staleTime: 1000 * 30 });
}

export function useUnreadCount() {
  return useQuery({ queryKey: ["notificationsUnreadCount"], queryFn: () => api.get("/notifications/unread-count").then((d) => d.count) });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] }); },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/mark-all-read"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] }); },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] }); },
  });
}

export function useLiveNotifications(onNew?: (n: any) => void) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleNew(notification: any) {
      qc.setQueryData(["notifications"], (old: any[] = []) => [notification, ...old]);
      qc.setQueryData(["notificationsUnreadCount"], (old: number = 0) => old + 1);
      onNew?.(notification);
    }

    socket.on("notification:new", handleNew);
    return () => { socket.off("notification:new", handleNew); };
  }, [qc, onNew]);
}
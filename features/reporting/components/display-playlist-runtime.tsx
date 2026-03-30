"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DisplayPlaylistRuntimeProps = {
  playlistId: string;
  playlistSlug: string;
  accessToken: string;
  screenKey: string;
  screenLabel: string;
  currentIndex: number;
  totalItems: number;
  rotationSeconds: number;
  heartbeatIntervalSeconds: number;
  currentTemplateSlug: string;
  anchorDate?: string;
};

export function DisplayPlaylistRuntime({
  playlistId,
  playlistSlug,
  accessToken,
  screenKey,
  screenLabel,
  currentIndex,
  totalItems,
  rotationSeconds,
  heartbeatIntervalSeconds,
  currentTemplateSlug,
  anchorDate,
}: DisplayPlaylistRuntimeProps) {
  const router = useRouter();

  useEffect(() => {
    const heartbeat = () => {
      void fetch("/api/display/heartbeat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          playlistId,
          screenKey,
          screenLabel,
          templateSlug: currentTemplateSlug,
          path: `/display/playlists/${playlistSlug}`,
          anchorDate: anchorDate ?? null,
        }),
      });
    };

    heartbeat();
    const heartbeatHandle = window.setInterval(
      heartbeat,
      heartbeatIntervalSeconds * 1000,
    );

    return () => window.clearInterval(heartbeatHandle);
  }, [
    accessToken,
    anchorDate,
    currentTemplateSlug,
    heartbeatIntervalSeconds,
    playlistId,
    playlistSlug,
    screenKey,
    screenLabel,
  ]);

  useEffect(() => {
    if (totalItems <= 1) {
      return;
    }

    const rotateHandle = window.setTimeout(() => {
      const nextIndex = (currentIndex + 1) % totalItems;
      const params = new URLSearchParams({
        access: accessToken,
        step: String(nextIndex),
        screen: screenKey,
        label: screenLabel,
      });

      if (anchorDate) {
        params.set("anchorDate", anchorDate);
      }

      router.replace(`/display/playlists/${playlistSlug}?${params.toString()}`);
    }, rotationSeconds * 1000);

    return () => window.clearTimeout(rotateHandle);
  }, [
    accessToken,
    anchorDate,
    currentIndex,
    playlistSlug,
    rotationSeconds,
    router,
    screenKey,
    screenLabel,
    totalItems,
  ]);

  return null;
}

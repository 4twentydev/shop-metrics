"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DisplayPlaylistRuntimeProps = {
  playlistId: string;
  playlistSlug: string;
  accessToken: string;
  basePath?: string;
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
  basePath = "/display/playlists",
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
    if (!accessToken) {
      return;
    }

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
          path: `${basePath}/${playlistSlug}`,
          anchorDate: anchorDate ?? null,
          heartbeatIntervalSeconds,
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
    basePath,
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
        step: String(nextIndex),
        screen: screenKey,
        label: screenLabel,
      });

      if (accessToken) {
        params.set("access", accessToken);
      }

      if (anchorDate) {
        params.set("anchorDate", anchorDate);
      }

      router.replace(`${basePath}/${playlistSlug}?${params.toString()}`);
    }, rotationSeconds * 1000);

    return () => window.clearTimeout(rotateHandle);
  }, [
    accessToken,
    anchorDate,
    basePath,
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

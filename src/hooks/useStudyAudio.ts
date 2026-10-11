"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const STORAGE_KEY_VOLUME = "codetogether_study_volume_v1";
const STORAGE_KEY_MUTED = "codetogether_study_muted_v1";

interface UseStudyAudioOptions {
  sceneId: string;
  audioUrl?: string;
  soundDescription?: string;
}

export function useStudyAudio({ sceneId, audioUrl, soundDescription }: UseStudyAudioOptions) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.4);
  const [isMuted, setIsMutedState] = useState<boolean>(false);

  // Audio Context and elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const synthSourceRef = useRef<AudioNode | null>(null);

  // Load volume and muted state from localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) setVolumeState(v);
      }
      const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
      if (savedMuted !== null) {
        setIsMutedState(savedMuted === "true");
      }
    } catch (_) {}
  }, []);

  // Save volume
  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : clamped * 0.15, audioCtxRef.current.currentTime);
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
    } catch (_) {}
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(next ? 0 : volume * 0.15, audioCtxRef.current.currentTime);
      }
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      } catch (_) {}
      return next;
    });
  }, [volume]);

  // Procedural Web Audio Ambient Noise Generator (Safe offline fallback)
  const startProceduralAmbience = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Stop previous
      if (synthSourceRef.current) {
        try {
          (synthSourceRef.current as any).stop?.();
          synthSourceRef.current.disconnect();
        } catch (_) {}
      }

      // Create filtered pink/brown noise for rain / ambient hum
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Lowpass filter for smooth rainfall / cafe hum
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = sceneId === "forest" ? 1800 : sceneId === "seaside" ? 900 : 700;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(isMuted ? 0 : volume * 0.15, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start();
      synthSourceRef.current = whiteNoise;
      gainNodeRef.current = gainNode;
    } catch (e) {
      console.warn("[StudyAudio] Procedural audio note:", e);
    }
  }, [sceneId, isMuted, volume]);

  const stopProceduralAmbience = useCallback(() => {
    if (synthSourceRef.current) {
      try {
        (synthSourceRef.current as any).stop?.();
        synthSourceRef.current.disconnect();
      } catch (_) {}
      synthSourceRef.current = null;
    }
  }, []);

  // Play audio (Always initiated by user gesture)
  const play = useCallback(() => {
    setIsPlaying(true);
    startProceduralAmbience();

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.loop = true;
      } else if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play().catch(() => {
        // Autoplay policy or 404 handled gracefully by Web Audio procedural fallback
      });
    }
  }, [audioUrl, isMuted, volume, startProceduralAmbience]);

  // Pause audio
  const pause = useCallback(() => {
    setIsPlaying(false);
    stopProceduralAmbience();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [stopProceduralAmbience]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProceduralAmbience();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopProceduralAmbience]);

  return {
    isPlaying,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    play,
    pause,
    togglePlay,
  };
}

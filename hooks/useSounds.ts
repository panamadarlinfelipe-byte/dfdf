
import { useState, useCallback, useRef, useEffect } from 'react';

// Función para reproducir un sonido con una frecuencia y duración específicas
const playTone = (context: AudioContext, frequency: number, duration: number, type: OscillatorType = 'sine') => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  
  // Control de volumen para evitar clics
  gainNode.gain.setValueAtTime(0.5, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + duration);
};

export const useSounds = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicializa el AudioContext en una interacción del usuario para cumplir con las políticas de autoplay
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    initializeAudio(); // Asegura que el audio esté listo al interactuar con el botón de silencio
  }, [initializeAudio]);

  const playCorrectSound = useCallback(() => {
    if (!isMuted && audioContextRef.current) {
      playTone(audioContextRef.current, 600, 0.1);
      playTone(audioContextRef.current, 800, 0.1);
    }
  }, [isMuted]);

  const playIncorrectSound = useCallback(() => {
    if (!isMuted && audioContextRef.current) {
      playTone(audioContextRef.current, 200, 0.2, 'square');
    }
  }, [isMuted]);

  const playGameOverSound = useCallback(() => {
    if (!isMuted && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      playTone(audioContextRef.current, 523, 0.15); // C5
      setTimeout(() => playTone(audioContextRef.current!, 659, 0.15), 150); // E5
      setTimeout(() => playTone(audioContextRef.current!, 784, 0.2), 300); // G5
    }
  }, [isMuted]);

  // Limpia el AudioContext cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { isMuted, toggleMute, playCorrectSound, playIncorrectSound, playGameOverSound, initializeAudio };
};

import React, { useState, useEffect, useRef } from 'react';

export default function VoiceSOS({ voiceActive }) {
  const [voiceStatus, setVoiceStatus] = useState('off'); // 'listening' | 'off' | 'triggered'
  const recognitionRef = useRef(null);
  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = recognitionRef.current;

    if (!recognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
    }

    recognition.onstart = () => {
      setVoiceStatus('listening');
    };

    recognition.onerror = (event) => {
      // Don't log sound-start / no-speech errors to console to avoid cluttering
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[VoiceSOS] Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (voiceActive) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[VoiceSOS] Failed to restart recognition:', e);
        }
      } else {
        setVoiceStatus('off');
      }
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal || event.results[i][0].confidence > 0.3) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          if (
            transcript.includes('help me') ||
            transcript.includes('safe word') ||
            transcript.includes('emergency')
          ) {
            console.log('[VoiceSOS] TRIGGER PHRASE DETECTED:', transcript);
            setVoiceStatus('triggered');
            
            // Dispatch window event
            window.dispatchEvent(new CustomEvent('trigger-sos'));

            // Reset indicator to listening after 3 seconds
            setTimeout(() => {
              if (voiceActive) {
                setVoiceStatus('listening');
              } else {
                setVoiceStatus('off');
              }
            }, 3000);
          }
        }
      }
    };

    if (voiceActive) {
      try {
        recognition.start();
      } catch (e) {
        // Recognition might already be running
      }
    } else {
      try {
        recognition.stop();
      } catch (e) {}
      setVoiceStatus('off');
    }

    return () => {
      // Clean up event handlers
      recognition.onstart = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [voiceActive, isSupported]);

  if (!isSupported) return null;

  const statusColor = {
    listening: '#22c55e', // green
    off: '#64748b',       // grey
    triggered: '#ef4444', // red
  }[voiceStatus];

  const isPulsing = voiceStatus === 'listening';
  const isFlashing = voiceStatus === 'triggered';

  return (
    <div
      className="voice-sos-indicator"
      style={{
        position: 'absolute',
        top: '90px',
        left: '24px',
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(13, 10, 30, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '6px 12px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'auto',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'inline-block',
          boxShadow: isFlashing
            ? '0 0 12px #ef4444'
            : isPulsing
            ? '0 0 8px #22c55e'
            : 'none',
          animation: isFlashing
            ? 'voice-flash 0.5s infinite alternate'
            : isPulsing
            ? 'voice-pulse 1.5s infinite'
            : 'none',
        }}
      />
      <span>
        {voiceStatus === 'listening'
          ? "Voice SOS active — say 'help me' anytime"
          : voiceStatus === 'triggered'
          ? 'EMERGENCY TRIGGERED!'
          : 'Voice SOS off'}
      </span>
      
      <style>{`
        @keyframes voice-pulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.2); opacity: 0.9; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes voice-flash {
          from { opacity: 0.3; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

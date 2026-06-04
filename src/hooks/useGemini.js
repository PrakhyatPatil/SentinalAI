import { useState, useCallback, useRef } from 'react';
import { getSafetySummary } from '../lib/gemini.js';

/**
 * useGemini — manages the Gemini API call lifecycle.
 * Debounces rapid re-calls with an AbortController pattern.
 */
export function useGemini() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  const fetchSummary = useCallback(async (promptData) => {
    abortRef.current = true; // cancel any prior pending call
    setSummary(null);
    setLoading(true);
    setError(null);

    const thisCall = {};
    abortRef.current = thisCall;

    try {
      const text = await getSafetySummary(promptData);
      if (abortRef.current !== thisCall) return; // superseded
      setSummary(text);
    } catch (err) {
      if (abortRef.current !== thisCall) return;
      setError(err.message);
    } finally {
      if (abortRef.current === thisCall) setLoading(false);
    }
  }, []);

  const clearSummary = useCallback(() => {
    abortRef.current = null;
    setSummary(null);
    setError(null);
  }, []);

  return { summary, loading, error, fetchSummary, clearSummary };
}

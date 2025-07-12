import { useState, useEffect, useCallback, useRef } from 'react';

export const useAutoSave = (data, saveFunction, options = {}) => {
  const {
    delay = 2000, // 2 seconds delay
    enabled = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const lastDataRef = useRef(null);

  // Check if data has changed
  const hasDataChanged = useCallback((newData) => {
    if (!lastDataRef.current) return true;
    return JSON.stringify(newData) !== JSON.stringify(lastDataRef.current);
  }, []);

  // Save function with error handling
  const save = useCallback(async (dataToSave) => {
    if (!enabled || !hasDataChanged(dataToSave)) return;

    setIsSaving(true);
    setError(null);
    
    if (onSaveStart) onSaveStart();

    try {
      await saveFunction(dataToSave);
      setLastSaved(new Date());
      lastDataRef.current = JSON.stringify(dataToSave);
      
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setError(err.message || 'Gabim në ruajtjen automatike');
      if (onSaveError) onSaveError(err);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, hasDataChanged, saveFunction, onSaveStart, onSaveSuccess, onSaveError]);

  // Debounced save
  const debouncedSave = useCallback((dataToSave) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save(dataToSave);
    }, delay);
  }, [save, delay]);

  // Effect to trigger auto-save when data changes
  useEffect(() => {
    if (data && enabled) {
      debouncedSave(data);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debouncedSave]);

  // Manual save function
  const manualSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await save(data);
  }, [save, data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    manualSave
  };
};
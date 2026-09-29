import { useState, useEffect, useCallback, useRef } from 'react';
import { projectAutosave, AutosavePayload, AutosaveRecord } from '../utils/projectAutosave';

interface UseAutosaveProps {
  getAutosavePayload: () => AutosavePayload | null;
  onRestoreDraft?: (record: AutosaveRecord) => void;
  isUserBusy?: () => boolean;
}

export function useAutosave({
  getAutosavePayload,
  onRestoreDraft,
  isUserBusy,
}: UseAutosaveProps) {
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('cartomancer_autosave_enabled');
      // Local recovery is the safe default for a map editor. Users can turn
      // it off explicitly from the autosave controls.
      return stored !== 'false';
    } catch {
      return false;
    }
  });

  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutosaveTime, setLastAutosaveTime] = useState<number | null>(() =>
    projectAutosave.getLastSavedTimestamp()
  );
  const [fsaFolderName, setFsaFolderName] = useState<string | null>(() =>
    projectAutosave.getLinkedFolderName()
  );
  const [recoveryDraft, setRecoveryDraft] = useState<AutosaveRecord | null>(null);

  const triggerAutosave = useCallback(async () => {
    const payload = getAutosavePayload();
    if (!payload) return;

    setAutosaveStatus('saving');
    try {
      const res = await projectAutosave.save(payload);
      if (res.success) {
        setAutosaveStatus('saved');
        setLastAutosaveTime(res.timestamp);
        setTimeout(() => setAutosaveStatus('idle'), 3500);
      } else {
        setAutosaveStatus('error');
      }
    } catch {
      setAutosaveStatus('error');
    }
  }, [getAutosavePayload]);

  const handleToggleAutosave = useCallback(
    (enabled: boolean) => {
      setIsAutosaveEnabled(enabled);
      try {
        localStorage.setItem('cartomancer_autosave_enabled', String(enabled));
      } catch {
        // ignore
      }
      if (enabled) {
        triggerAutosave();
      } else {
        setAutosaveStatus('idle');
      }
    },
    [triggerAutosave]
  );

  const handleSelectFolder = useCallback(async () => {
    try {
      const res = await projectAutosave.linkLocalFolder();
      if (res.success && res.folderName) {
        setFsaFolderName(res.folderName);
        triggerAutosave();
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.warn('Folder selection aborted or unsupported', err);
    }
  }, [triggerAutosave]);

  // Periodic 60s idle autosave
  useEffect(() => {
    if (!isAutosaveEnabled) return;

    const interval = setInterval(() => {
      if (isUserBusy?.()) {
        return;
      }
      triggerAutosave();
    }, 60000);

    return () => clearInterval(interval);
  }, [isAutosaveEnabled, triggerAutosave, isUserBusy]);

  // Initial recovery check
  useEffect(() => {
    projectAutosave.getLatestAutosave().then((draft) => {
      if (draft && draft.payload?.project) {
        const hasContent =
          (draft.payload.project.stamps && draft.payload.project.stamps.length > 0) ||
          (draft.payload.project.paths && draft.payload.project.paths.length > 0) ||
          (draft.payload.project.labels && draft.payload.project.labels.length > 0) ||
          Boolean(draft.payload.maskDataUrl) ||
          Boolean(draft.payload.textureDataUrl) ||
          Boolean(draft.payload.waterTextureDataUrl) ||
          Boolean(draft.payload.heightFieldData);

        if (hasContent) {
          // A saved local map is the user's working document. Restore it on
          // startup rather than making the user choose between it and the
          // welcome fixture.
          // Defer until the editor has created its offscreen canvases and
          // loaded the welcome fixture; the saved document then replaces it.
          window.setTimeout(() => onRestoreDraft?.(draft), 0);
        }
      }
    });
  }, [onRestoreDraft]);

  const handleRestoreRecoveryDraft = useCallback(() => {
    if (recoveryDraft) {
      onRestoreDraft?.(recoveryDraft);
      setRecoveryDraft(null);
    }
  }, [recoveryDraft, onRestoreDraft]);

  const handleDiscardRecoveryDraft = useCallback(() => {
    setRecoveryDraft(null);
  }, []);

  return {
    isAutosaveEnabled,
    autosaveStatus,
    lastAutosaveTime,
    fsaFolderName,
    recoveryDraft,
    triggerAutosave,
    handleToggleAutosave,
    handleSelectFolder,
    handleRestoreRecoveryDraft,
    handleDiscardRecoveryDraft,
  };
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedPath } from '../types';
import { mergeOrAddPath } from '../utils/pathSnapping';

interface UsePathManagerProps {
  initialPaths?: PlacedPath[];
  pushHistorySnapshot: (description: string, overrides?: { paths?: PlacedPath[] }) => void;
  requestRedraw: (overrides?: { paths?: PlacedPath[] }) => void;
  isPathsActive: () => boolean;
}

export function usePathManager({
  initialPaths = [],
  pushHistorySnapshot,
  requestRedraw,
  isPathsActive,
}: UsePathManagerProps) {
  const [paths, setPathsState] = useState<PlacedPath[]>(initialPaths);
  const pathsRef = useRef<PlacedPath[]>(paths);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [activePathDraft, setActivePathDraft] = useState<any | null>(null);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  const setPaths = useCallback((newPaths: PlacedPath[]) => {
    pathsRef.current = newPaths;
    setPathsState(newPaths);
  }, []);

  const handleUpdateSelectedPath = useCallback(
    (updates: Partial<PlacedPath>) => {
      if (!selectedPathId || !isPathsActive()) return;
      const updated = pathsRef.current.map((p) =>
        p.id === selectedPathId ? { ...p, ...updates } : p
      );
      pathsRef.current = updated;
      setPathsState(updated);
      requestRedraw({ paths: updated });
    },
    [selectedPathId, isPathsActive, requestRedraw]
  );

  const handleDeleteSelectedPath = useCallback(() => {
    if (!selectedPathId || !isPathsActive()) return;
    const remaining = pathsRef.current.filter((p) => p.id !== selectedPathId);
    pathsRef.current = remaining;
    setPathsState(remaining);
    setSelectedPathId(null);
    pushHistorySnapshot('Delete Path', { paths: remaining });
    requestRedraw({ paths: remaining });
  }, [selectedPathId, isPathsActive, pushHistorySnapshot, requestRedraw]);

  const handleDeletePathById = useCallback(
    (id: string) => {
      const updated = pathsRef.current.filter((p) => p.id !== id);
      pathsRef.current = updated;
      setPathsState(updated);
      if (selectedPathId === id) setSelectedPathId(null);
      pushHistorySnapshot('Delete River / Route', { paths: updated });
      requestRedraw({ paths: updated });
    },
    [selectedPathId, pushHistorySnapshot, requestRedraw]
  );

  const handleCommitPath = useCallback(
    (newPath: PlacedPath, autoMerge: boolean = true) => {
      if (!isPathsActive()) return;
      const merged = mergeOrAddPath(newPath, pathsRef.current, autoMerge);
      pathsRef.current = merged;
      setPathsState(merged);
      setActivePathDraft(null);
      pushHistorySnapshot(`Add ${newPath.style === 'river' ? 'River' : 'Path'}`, { paths: merged });
      requestRedraw({ paths: merged });
    },
    [isPathsActive, pushHistorySnapshot, requestRedraw]
  );

  return {
    paths,
    pathsRef,
    setPaths,
    selectedPathId,
    setSelectedPathId,
    activePathDraft,
    setActivePathDraft,
    handleUpdateSelectedPath,
    handleDeleteSelectedPath,
    handleDeletePathById,
    handleCommitPath,
  };
}

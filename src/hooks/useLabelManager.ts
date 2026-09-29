import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedText } from '../types';

interface UseLabelManagerProps {
  initialLabels?: PlacedText[];
  pushHistorySnapshot: (description: string, overrides?: { labels?: PlacedText[] }) => void;
  requestRedraw: (overrides?: { labels?: PlacedText[] }) => void;
  isLabelsActive: () => boolean;
}

export function useLabelManager({
  initialLabels = [],
  pushHistorySnapshot,
  requestRedraw,
  isLabelsActive,
}: UseLabelManagerProps) {
  const [labels, setLabelsState] = useState<PlacedText[]>(initialLabels);
  const labelsRef = useRef<PlacedText[]>(labels);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  const setLabels = useCallback((newLabels: PlacedText[]) => {
    labelsRef.current = newLabels;
    setLabelsState(newLabels);
  }, []);

  const handleAddLabel = useCallback(
    (newLabel: PlacedText) => {
      if (!isLabelsActive()) return;
      const updatedLabels = [...labelsRef.current, newLabel];
      labelsRef.current = updatedLabels;
      setLabelsState(updatedLabels);
      setSelectedLabelId(newLabel.id);
      pushHistorySnapshot('Place Label', { labels: updatedLabels });
      requestRedraw({ labels: updatedLabels });
    },
    [isLabelsActive, pushHistorySnapshot, requestRedraw]
  );

  const handleUpdateSelectedLabel = useCallback(
    (updates: Partial<PlacedText>) => {
      if (!selectedLabelId || !isLabelsActive()) return;
      pushHistorySnapshot('Edit Label', { labels: labelsRef.current });
      const next = labelsRef.current.map((l) => (l.id === selectedLabelId ? { ...l, ...updates } : l));
      labelsRef.current = next;
      setLabelsState(next);
      requestRedraw({ labels: next });
    },
    [selectedLabelId, isLabelsActive, pushHistorySnapshot, requestRedraw]
  );

  const handleDeleteSelectedLabel = useCallback(() => {
    if (!selectedLabelId || !isLabelsActive()) return;
    const remaining = labelsRef.current.filter((l) => l.id !== selectedLabelId);
    labelsRef.current = remaining;
    setLabelsState(remaining);
    setSelectedLabelId(null);
    pushHistorySnapshot('Delete Label', { labels: remaining });
    requestRedraw({ labels: remaining });
  }, [selectedLabelId, isLabelsActive, pushHistorySnapshot, requestRedraw]);

  const handleDeleteLabelById = useCallback(
    (id: string) => {
      const updated = labelsRef.current.filter((l) => l.id !== id);
      labelsRef.current = updated;
      setLabelsState(updated);
      if (selectedLabelId === id) setSelectedLabelId(null);
      pushHistorySnapshot('Delete Map Label', { labels: updated });
      requestRedraw({ labels: updated });
    },
    [selectedLabelId, pushHistorySnapshot, requestRedraw]
  );

  const handleDuplicateSelectedLabel = useCallback(() => {
    if (!selectedLabelId || !isLabelsActive()) return;
    const l = labelsRef.current.find((item) => item.id === selectedLabelId);
    if (!l) return;
    const clone: PlacedText = {
      ...l,
      id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: l.x + 30,
      y: l.y + 30,
    };
    const next = [...labelsRef.current, clone];
    labelsRef.current = next;
    setLabelsState(next);
    setSelectedLabelId(clone.id);
    pushHistorySnapshot('Duplicate Label', { labels: next });
    requestRedraw({ labels: next });
  }, [selectedLabelId, isLabelsActive, pushHistorySnapshot, requestRedraw]);

  return {
    labels,
    labelsRef,
    setLabels,
    selectedLabelId,
    setSelectedLabelId,
    handleAddLabel,
    handleUpdateSelectedLabel,
    handleDeleteSelectedLabel,
    handleDeleteLabelById,
    handleDuplicateSelectedLabel,
  };
}

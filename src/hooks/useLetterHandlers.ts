import { useState, useCallback } from 'react';
import { EventItem } from '../types';

export interface LetterHandlersResult {
  showLetterPickerModal: boolean;
  setShowLetterPickerModal: (v: boolean) => void;
  showLetterModal: boolean;
  setShowLetterModal: (v: boolean) => void;
  letterEvent: EventItem | null;
  setLetterEvent: (v: EventItem | null) => void;
  handleOpenLetterPicker: () => void;
  handleOpenLetter: (event: EventItem) => void;
  handleSelectLetterEvent: (event: EventItem) => void;
}

export function useLetterHandlers(): LetterHandlersResult {
  const [showLetterPickerModal, setShowLetterPickerModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [letterEvent, setLetterEvent] = useState<EventItem | null>(null);

  const handleOpenLetter = useCallback((event: EventItem) => {
    setLetterEvent(event);
    setShowLetterModal(true);
  }, []);

  const handleOpenLetterPicker = useCallback(() => {
    setShowLetterPickerModal(true);
  }, []);

  const handleSelectLetterEvent = useCallback((event: EventItem) => {
    setShowLetterPickerModal(false);
    handleOpenLetter(event);
  }, [handleOpenLetter]);

  return {
    showLetterPickerModal, setShowLetterPickerModal,
    showLetterModal, setShowLetterModal,
    letterEvent, setLetterEvent,
    handleOpenLetterPicker, handleOpenLetter, handleSelectLetterEvent,
  };
}
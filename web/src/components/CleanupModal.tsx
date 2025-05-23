import i18n from "@/i18n/init";
import k from "./../i18n/keys";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Clock, Loader2, Trash, X } from "lucide-react";

export enum CleanupPeriod {
  Day = "day",
  Week = "week",
  Month = "month",
  All = "all",
}

interface CleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (period: CleanupPeriod, value: number) => void;
}

export const CleanupModal: React.FC<CleanupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<CleanupPeriod | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleOptionSelect = (period: CleanupPeriod) => {
    setSelectedPeriod(period);
  };

  const handleConfirm = async () => {
    if (!selectedPeriod) return;

    setIsLoading(true);
    try {
      // Значение всегда равно 1 для фиксированных параметров или 0 для "All"
      const value = selectedPeriod === CleanupPeriod.All ? 0 : 1;
      await onConfirm(selectedPeriod, value);
      // Модальное окно будет закрыто родительским компонентом после onConfirm
    } catch (error) {
      console.error("Ошибка очистки:", error);
      setIsLoading(false);
      // Позвольте родительскому компоненту обработать ошибку, оставьте модальное окно открытым со сбросом состояния загрузки
    }
  };

  const getDeleteButtonText = () => {
    if (!selectedPeriod) return "Сначала выберите параметр";

    switch (selectedPeriod) {
      case CleanupPeriod.Day:
        return "Удалить файлы старше 1 дня";
      case CleanupPeriod.Week:
        return "Удалить файлы старше 1 недели";
      case CleanupPeriod.Month:
        return "Удалить файлы старше 1 месяца";
      case CleanupPeriod.All:
        return "Удалить все файлы";
    }
  };

  // Helper to get the appropriate variant based on period and selection state
  const getButtonVariant = (period: CleanupPeriod) => {
    if (selectedPeriod === period) {
      return `time-${period}-selected` as const;
    }
    return `time-${period}` as const;
  };

  // Helper to get icon styling based on selection state
  const getIconClass = (period: CleanupPeriod) => {
    const isSelected = selectedPeriod === period;

    switch (period) {
      case CleanupPeriod.Day:
        return `h-4 w-4 mb-1 ${
          isSelected
            ? "text-blue-600 dark:text-blue-300"
            : "text-blue-500 dark:text-blue-400"
        }`;

      case CleanupPeriod.Week:
        return `h-4 w-4 mb-1 ${
          isSelected
            ? "text-green-600 dark:text-green-300"
            : "text-green-500 dark:text-green-400"
        }`;

      case CleanupPeriod.Month:
        return `h-4 w-4 mb-1 ${
          isSelected
            ? "text-purple-600 dark:text-purple-300"
            : "text-purple-500 dark:text-purple-400"
        }`;

      case CleanupPeriod.All:
        return `h-4 w-4 mb-1 ${
          isSelected
            ? "text-red-600 dark:text-red-300"
            : "text-red-500 dark:text-red-400"
        }`;
    }
  };

  return (
    <div className="fixed z-[10000] inset-0 bg-neutral-900/50 dark:bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium dark:text-white">
            {i18n.t(k.CLEANUP_DOCUMENTS)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
          {i18n.t(k.FIRST_SELECT_HOW_FAR_BACK_TO)}
        </p>

        <div className="flex space-x-3 mb-5">
          <Button
            variant={getButtonVariant(CleanupPeriod.Day)}
            onClick={() => handleOptionSelect(CleanupPeriod.Day)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 h-auto transition-colors duration-200"
          >
            <div className="flex flex-col items-center">
              <Clock className={getIconClass(CleanupPeriod.Day)} />
              <span className="font-medium">{i18n.t(k.DAY1)}</span>
            </div>
          </Button>

          <Button
            variant={getButtonVariant(CleanupPeriod.Week)}
            onClick={() => handleOptionSelect(CleanupPeriod.Week)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 h-auto transition-colors duration-200"
          >
            <div className="flex flex-col items-center">
              <Calendar className={getIconClass(CleanupPeriod.Week)} />
              <span className="font-medium">{i18n.t(k.WEEK)}</span>
            </div>
          </Button>

          <Button
            variant={getButtonVariant(CleanupPeriod.Month)}
            onClick={() => handleOptionSelect(CleanupPeriod.Month)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 h-auto transition-colors duration-200"
          >
            <div className="flex flex-col items-center">
              <Calendar className={getIconClass(CleanupPeriod.Month)} />
              <span className="font-medium">{i18n.t(k.MONTH)}</span>
            </div>
          </Button>

          <Button
            variant={getButtonVariant(CleanupPeriod.All)}
            onClick={() => handleOptionSelect(CleanupPeriod.All)}
            disabled={isLoading}
            className="flex-1 px-3 py-2 h-auto transition-colors duration-200"
          >
            <div className="flex flex-col items-center">
              <Trash className={getIconClass(CleanupPeriod.All)} />
              <span className="font-medium">{i18n.t(k.ALL_TIME1)}</span>
            </div>
          </Button>
        </div>

        {selectedPeriod === CleanupPeriod.All && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-md p-3 mb-4 flex items-start">
            <AlertCircle className="text-red-500 dark:text-red-400 h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {i18n.t(k.WARNING_THIS_WILL_DELETE_ALL)}
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {i18n.t(k.THIS_ACTION_CANNOT_BE_UNDONE)}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {i18n.t(k.NOTE_THIS_ACTION_CANNOT_BE_UN)}
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200"
            >
              {i18n.t(k.CANCEL)}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!selectedPeriod || isLoading}
              className="min-w-[140px] bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {i18n.t(k.DELETING1)}
                </>
              ) : (
                getDeleteButtonText()
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

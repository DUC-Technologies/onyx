import i18n from "@/i18n/init";
import k from "./../../i18n/keys";
import { Modal } from "../Modal";
import { Button } from "../ui/button";

export const ConfirmEntityModal = ({
  onClose,
  onSubmit,
  entityType,
  entityName,
  additionalDetails,
  actionButtonText,
  actionText,
  includeCancelButton = true,
  variant = "delete",
  accent = false,
  removeConfirmationText = false,
}: {
  entityType: string;
  entityName: string;
  onClose: () => void;
  onSubmit: () => void;
  additionalDetails?: string;
  actionButtonText?: string;
  actionText?: string;
  includeCancelButton?: boolean;
  variant?: "delete" | "action";
  accent?: boolean;
  removeConfirmationText?: boolean;
}) => {
  const isDeleteVariant = variant === "delete";
  const defaultButtonText = isDeleteVariant ? "Delete" : "Confirm";
  const buttonText = actionButtonText || defaultButtonText;

  const getActionText = () => {
    if (actionText) {
      return actionText;
    }
    return isDeleteVariant ? "delete" : "modify";
  };

  return (
    <Modal width="rounded max-w-md w-full" onOutsideClick={onClose}>
      <>
        <div className="flex mb-4">
          <h2 className="my-auto text-2xl font-bold">
            {buttonText} {entityType}
          </h2>
        </div>
        {!removeConfirmationText && (
          <p className="mb-4">
            {i18n.t(k.ARE_YOU_SURE_YOU_WANT_TO)} {getActionText()}{" "}
            <b>{entityName}</b>
            {i18n.t(k._10)}
          </p>
        )}
        {additionalDetails && <p className="mb-4">{additionalDetails}</p>}
        <div className="flex justify-end gap-2">
          {includeCancelButton && (
            <Button onClick={onClose} variant="outline">
              {i18n.t(k.CANCEL)}
            </Button>
          )}
          <Button
            onClick={onSubmit}
            variant={
              accent ? "agent" : isDeleteVariant ? "destructive" : "default"
            }
          >
            {buttonText}
          </Button>
        </div>
      </>
    </Modal>
  );
};

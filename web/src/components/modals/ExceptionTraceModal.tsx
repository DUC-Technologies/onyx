import i18n from "@/i18n/init";
import k from "./../../i18n/keys";
import { useState } from "react";
import { Modal } from "../Modal";
import { CheckmarkIcon, CopyIcon } from "../icons/icons";

export default function ExceptionTraceModal({
  onOutsideClick,
  exceptionTrace,
}: {
  onOutsideClick: () => void;
  exceptionTrace: string;
}) {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <Modal
      width="w-4/6"
      className="h-5/6 overflow-y-hidden flex flex-col"
      title="Полная трассировка исключений"
      onOutsideClick={onOutsideClick}
    >
      <div className="overflow-y-auto default-scrollbar overflow-x-hidden pr-3 h-full mb-6">
        <div className="mb-6">
          {!copyClicked ? (
            <div
              onClick={() => {
                navigator.clipboard.writeText(exceptionTrace!);
                setCopyClicked(true);
                setTimeout(() => setCopyClicked(false), 2000);
              }}
              className="flex w-fit cursor-pointer hover:bg-accent-background p-2 border-border border rounded"
            >
              {i18n.t(k.COPY_FULL_TRACE)}
              <CopyIcon className="ml-2 my-auto" />
            </div>
          ) : (
            <div className="flex w-fit hover:bg-accent-background p-2 border-border border rounded cursor-default">
              {i18n.t(k.COPIED_TO_CLIPBOARD)}
              <CheckmarkIcon
                className="my-auto ml-2 flex flex-shrink-0 text-success"
                size={16}
              />
            </div>
          )}
        </div>
        <div className="whitespace-pre-wrap">{exceptionTrace}</div>
      </div>
    </Modal>
  );
}

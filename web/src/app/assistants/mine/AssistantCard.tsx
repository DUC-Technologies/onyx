import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import React, { useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiMoreHorizontal,
  FiTrash,
  FiEdit,
  FiBarChart,
  FiLock,
  FiUnlock,
} from "react-icons/fi";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Persona } from "@/app/admin/assistants/interfaces";
import { useUser } from "@/components/user/UserProvider";
import { useAssistants } from "@/components/context/AssistantsContext";
import { checkUserOwnsAssistant } from "@/lib/assistants/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PinnedIcon } from "@/components/icons/icons";
import { deletePersona } from "@/app/admin/assistants/lib";
import { PencilIcon } from "lucide-react";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { truncateString } from "@/lib/utils";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/ui/button";

export const AssistantBadge = ({
  text,
  className,
  maxLength,
}: {
  text: string;
  className?: string;
  maxLength?: number;
}) => {
  return (
    <div
      className={`h-4 px-1.5 py-1 text-[10px] flex-none bg-neutral-200/50 dark:bg-neutral-700 rounded-lg justify-center items-center gap-1 inline-flex ${className}`}
    >
      <div className="text-text-800 font-normal leading-[8px]">
        {maxLength ? truncateString(text, maxLength) : text}
      </div>
    </div>
  );
};

const AssistantCard: React.FC<{
  persona: Persona;
  pinned: boolean;
  closeModal: () => void;
}> = ({ persona, pinned, closeModal }) => {
  const { user, toggleAssistantPinnedStatus } = useUser();
  const router = useRouter();
  const { refreshAssistants, pinnedAssistants } = useAssistants();
  const { popup, setPopup } = usePopup();

  const isOwnedByUser = checkUserOwnsAssistant(user, persona);

  const [activePopover, setActivePopover] = useState<string | null | undefined>(
    undefined
  );

  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const [isDeleteConfirmation, setIsDeleteConfirmation] = useState(false);

  const handleDelete = () => {
    setIsDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    const response = await deletePersona(persona.id);
    if (response.ok) {
      await refreshAssistants();
      setActivePopover(null);
      setIsDeleteConfirmation(false);
      setPopup({
        message: `${persona.name} был успешно удален.`,
        type: "success",
      });
    } else {
      setPopup({
        message: `Не удалось удалить помощника - ${await response.text()}`,
        type: "error",
      });
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmation(false);
  };

  const handleEdit = () => {
    router.push(`/assistants/edit/${persona.id}`);
    setActivePopover(null);
  };

  const closePopover = () => setActivePopover(undefined);

  const nameRef = useRef<HTMLHeadingElement>(null);
  const hiddenNameRef = useRef<HTMLSpanElement>(null);
  const [isNameTruncated, setIsNameTruncated] = useState(false);

  useLayoutEffect(() => {
    const checkTruncation = () => {
      if (nameRef.current && hiddenNameRef.current) {
        const visibleWidth = nameRef.current.offsetWidth;
        const fullTextWidth = hiddenNameRef.current.offsetWidth;
        setIsNameTruncated(fullTextWidth > visibleWidth);
      }
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [persona.name]);

  return (
    <div className="w-full text-text-800 p-2 overflow-visible pb-4 pt-3 bg-transparent dark:bg-neutral-800/80 rounded shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] flex flex-col">
      {popup}
      <div className="w-full flex">
        <div className="ml-2 flex-none mr-2 mt-1 w-10 h-10">
          <AssistantIcon assistant={persona} size="large" />
        </div>
        <div className="flex-1 mt-1 flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-end gap-x-2 leading-none">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3
                      ref={nameRef}
                      className={`text-neutral-900 dark:text-neutral-100 line-clamp-1 break-all	 text-ellipsis leading-none font-semibold text-base lg-normal w-full overflow-hidden`}
                    >
                      {persona.name}
                    </h3>
                  </TooltipTrigger>
                  {isNameTruncated && (
                    <TooltipContent>{persona.name}</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <span
                ref={hiddenNameRef}
                className="absolute left-0 top-0 invisible whitespace-nowrap"
                aria-hidden="true"
              >
                {persona.name}
              </span>
              {persona.labels && persona.labels.length > 0 && (
                <>
                  {persona.labels.slice(0, 2).map((label, index) => (
                    <AssistantBadge
                      key={index}
                      text={label.name}
                      maxLength={10}
                    />
                  ))}
                  {persona.labels.length > 2 && (
                    <AssistantBadge
                      text={`${i18n.t(k._9)}${
                        persona.labels.length - 2
                      } ${i18n.t(k.MORE)}`}
                    />
                  )}
                </>
              )}
            </div>
            {isOwnedByUser && (
              <div className="flex ml-2 relative items-center gap-x-2">
                <Popover>
                  <PopoverTrigger>
                    <button
                      type="button"
                      className="hover:bg-neutral-200 dark:hover:bg-neutral-700 p-1 -my-1 rounded-full"
                    >
                      <FiMoreHorizontal size={16} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={`${
                      isDeleteConfirmation ? "w-64" : "w-32"
                    } z-[10000] p-2`}
                  >
                    {!isDeleteConfirmation ? (
                      <div className="flex flex-col text-sm space-y-1">
                        <button
                          onClick={isOwnedByUser ? handleEdit : undefined}
                          className={`w-full flex items-center text-left px-2 py-1 rounded ${
                            isOwnedByUser
                              ? "hover:bg-neutral-200 dark:hover:bg-neutral-700"
                              : "opacity-50 cursor-not-allowed"
                          }`}
                          disabled={!isOwnedByUser}
                        >
                          <FiEdit size={12} className="inline mr-2" />
                          {i18n.t(k.EDIT)}
                        </button>
                        {isPaidEnterpriseFeaturesEnabled && isOwnedByUser && (
                          <button
                            onClick={
                              isOwnedByUser
                                ? () => {
                                    router.push(
                                      `${i18n.t(k.ASSISTANTS_STATS)}${
                                        persona.id
                                      }`
                                    );
                                    closePopover();
                                  }
                                : undefined
                            }
                            className={`w-full text-left items-center px-2 py-1 rounded ${
                              isOwnedByUser
                                ? "hover:bg-neutral-200 dark:hover:bg-neutral-800"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <FiBarChart size={12} className="inline mr-2" />
                            {i18n.t(k.STATS)}
                          </button>
                        )}
                        <button
                          onClick={isOwnedByUser ? handleDelete : undefined}
                          className={`w-full text-left items-center px-2 py-1 rounded ${
                            isOwnedByUser
                              ? "hover:bg-neutral-200 dark:hover:bg-neutral- text-red-600 dark:text-red-400"
                              : "opacity-50 cursor-not-allowed text-red-300 dark:text-red-500"
                          }`}
                          disabled={!isOwnedByUser}
                        >
                          <FiTrash size={12} className="inline mr-2" />
                          {i18n.t(k.DELETE)}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <p className="text-sm mb-3">
                          {i18n.t(k.ARE_YOU_SURE_YOU_WANT_TO_DELET)}{" "}
                          <b>{persona.name}</b>
                          {i18n.t(k._10)}
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={cancelDelete}
                          >
                            {i18n.t(k.CANCEL)}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={confirmDelete}
                          >
                            {i18n.t(k.DELETE)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <p className="text-neutral-800 dark:text-neutral-200 font-[350] mt-0 text-sm line-clamp-2 h-[2.7em]">
            {persona.description || "\u00A0"}
          </p>

          <div className="flex flex-col ">
            <div className="my-1.5">
              <p className="flex flex-wrap items-center text-neutral-800 dark:text-neutral-200 text-xs opacity-50">
                {persona.owner?.email || persona.builtin_persona ? (
                  <>
                    <span className="truncate">
                      {i18n.t(k.BY)} {persona.owner?.email || i18n.t(k.ONYX)}
                    </span>

                    <span className="mx-2">{i18n.t(k._11)}</span>
                  </>
                ) : null}
                <span className="flex-none truncate">
                  {persona.tools.length > 0 ? (
                    <>
                      {persona.tools.length}
                      {i18n.t(k.ACTION)}
                      {persona.tools.length !== 1 ? i18n.t(k.S) : ""}
                    </>
                  ) : (
                    i18n.t(k.NO_ACTIONS)
                  )}
                </span>
                <span className="mx-2">{i18n.t(k._11)}</span>
                {persona.is_public ? (
                  <div>
                    <FiUnlock size={12} className="inline mr-1" />
                    {i18n.t(k.PUBLIC)}
                  </div>
                ) : (
                  <div>
                    <FiLock size={12} className="inline mr-1" />
                    {i18n.t(k.PRIVATE1)}
                  </div>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      router.push(`/chat?assistantId=${persona.id}`);
                      closeModal();
                    }}
                    className="hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:bg-[#2E2E2D] hover:text-neutral-900 dark:hover:text-neutral-100 px-2 py-1 gap-x-1 rounded border border-neutral-400 dark:border-neutral-600 flex items-center"
                  >
                    <PencilIcon size={12} className="flex-none" />
                    <span className="text-xs">{i18n.t(k.START_CHAT)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {i18n.t(k.START_A_NEW_CHAT_WITH_THIS_ASS)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={async () => {
                      await toggleAssistantPinnedStatus(
                        pinnedAssistants.map((a) => a.id),
                        persona.id,
                        !pinned
                      );
                    }}
                    className="hover:bg-neutral-100  dark:hover:bg-neutral-700 dark:bg-[#2E2E2D] px-2 group cursor-pointer py-1 gap-x-1 relative rounded border border-neutral-400 dark:border-neutral-600 flex items-center"
                  >
                    <PinnedIcon size={12} />
                    {!pinned ? (
                      <p className="w-full left-0 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 w-full text-center transform text-xs">
                        {i18n.t(k.PIN)}
                      </p>
                    ) : (
                      <p className="text-xs group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                        {i18n.t(k.UNPIN)}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {pinned ? i18n.t(k.REMOVE_FROM) : i18n.t(k.ADD_TO)}{" "}
                  {i18n.t(k.YOUR_PINNED_LIST)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center"></div>
    </div>
  );
};
export default AssistantCard;

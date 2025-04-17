import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { MinimalUserSnapshot, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FiPlus, FiX } from "react-icons/fi";
import { Persona } from "@/app/admin/assistants/interfaces";
import { SearchMultiSelectDropdown } from "@/components/Dropdown";
import { UsersIcon } from "@/components/icons/icons";
import { AssistantSharedStatusDisplay } from "../AssistantSharedStatus";
import {
  addUsersToAssistantSharedList,
  removeUsersFromAssistantSharedList,
} from "@/lib/assistants/shareAssistant";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Bubble } from "@/components/Bubble";
import { useRouter } from "next/navigation";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Spinner } from "@/components/Spinner";
import { useAssistants } from "@/components/context/AssistantsContext";

interface AssistantSharingModalProps {
  assistant: Persona;
  user: User | null;
  allUsers: MinimalUserSnapshot[];
  show: boolean;
  onClose: () => void;
}

export function AssistantSharingModal({
  assistant,
  user,
  allUsers,
  show,
  onClose,
}: AssistantSharingModalProps) {
  const { refreshAssistants } = useAssistants();
  const { popup, setPopup } = usePopup();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<MinimalUserSnapshot[]>([]);

  const assistantName = assistant.name;
  const sharedUsersWithoutOwner = (assistant.users || [])?.filter(
    (u) => u.id !== assistant.owner?.id
  );

  if (!show) {
    return null;
  }

  const handleShare = async () => {
    setIsUpdating(true);
    const startTime = Date.now();

    const error = await addUsersToAssistantSharedList(
      assistant,
      selectedUsers.map((user) => user.id)
    );
    await refreshAssistants();

    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 1000 - elapsedTime);

    setTimeout(() => {
      setIsUpdating(false);
      if (error) {
        setPopup({
          message: `Не удалось поделиться помощником - ${error}`,
          type: "error",
        });
      }
    }, remainingTime);
  };

  let sharedStatus = null;
  if (assistant.is_public || !sharedUsersWithoutOwner.length) {
    sharedStatus = (
      <AssistantSharedStatusDisplay
        size="md"
        assistant={assistant}
        user={user}
      />
    );
  } else {
    sharedStatus = (
      <div>
        {i18n.t(k.SHARED_WITH)}{" "}
        <div className="flex flex-wrap gap-x-2 mt-2">
          {sharedUsersWithoutOwner.map((u) => (
            <Bubble
              key={u.id}
              isSelected={false}
              onClick={async () => {
                setIsUpdating(true);
                const startTime = Date.now();

                const error = await removeUsersFromAssistantSharedList(
                  assistant,
                  [u.id]
                );
                await refreshAssistants();

                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 1000 - elapsedTime);

                setTimeout(() => {
                  setIsUpdating(false);
                  if (error) {
                    setPopup({
                      message: `${i18n.t(
                        k.FAILED_TO_REMOVE_ASSISTANT
                      )} ${error}`,
                      type: "error",
                    });
                  }
                }, remainingTime);
              }}
            >
              <div className="flex">
                {u.email} <FiX className="ml-1 my-auto" />
              </div>
            </Bubble>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {popup}
      <Modal
        width="max-w-3xl w-full"
        title={
          <div className="flex items-end space-x-3">
            <AssistantIcon size="large" assistant={assistant} />
            <h2 className="text-3xl text-text-800 font-semibold">
              {assistantName}
            </h2>
          </div>
        }
        onOutsideClick={onClose}
      >
        <div>
          <p className="text-text-600 text-lg mb-6">
            {i18n.t(k.MANAGE_ACCESS_TO_THIS_ASSISTAN)}
          </p>

          <div className="mb-8 flex flex-col gap-y-4">
            <h3 className="text-lg font-semibold">
              {i18n.t(k.CURRENT_STATUS)}
            </h3>
            <div className="bg-background-50 rounded-lg">{sharedStatus}</div>
          </div>

          <div className="mb-8 flex flex-col gap-y-4">
            <h3 className="text-lg font-semibold">
              {i18n.t(k.SHARE_ASSISTANT)}
            </h3>
            <SearchMultiSelectDropdown
              options={allUsers
                .filter(
                  (u1) =>
                    !selectedUsers.map((u2) => u2.id).includes(u1.id) &&
                    !sharedUsersWithoutOwner
                      .map((u2) => u2.id)
                      .includes(u1.id) &&
                    u1.id !== user?.id
                )
                .map((user) => ({
                  name: user.email,
                  value: user.id,
                }))}
              onSelect={(option) => {
                setSelectedUsers([
                  ...Array.from(
                    new Set([
                      ...selectedUsers,
                      { id: option.value as string, email: option.name },
                    ])
                  ),
                ]);
              }}
              itemComponent={({ option }) => (
                <div className="flex items-center px-4 py-2.5 cursor-pointer hover:bg-background-100">
                  <UsersIcon className="mr-3 text-text-500" />
                  <span className="flex-grow">{option.name}</span>
                  <FiPlus className="text-blue-500" />
                </div>
              )}
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-text-700 mb-2">
                {i18n.t(k.SELECTED_USERS)}
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((selectedUser) => (
                  <div
                    key={selectedUser.id}
                    onClick={() => {
                      setSelectedUsers(
                        selectedUsers.filter(
                          (user) => user.id !== selectedUser.id
                        )
                      );
                    }}
                    className="flex items-center bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm hover:bg-blue-100 transition-colors duration-200 cursor-pointer"
                  >
                    {selectedUser.email}
                    <FiX className="ml-2 text-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUsers.length > 0 && (
            <Button
              onClick={() => {
                handleShare();
                setSelectedUsers([]);
              }}
              size="sm"
              variant="secondary"
            >
              {i18n.t(k.SHARE_WITH_SELECTED_USERS)}
            </Button>
          )}
        </div>
      </Modal>
      {isUpdating && <Spinner />}
    </>
  );
}

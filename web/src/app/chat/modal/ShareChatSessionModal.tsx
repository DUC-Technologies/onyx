import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

import Text from "@/components/ui/text";

import { ChatSessionSharedStatus } from "../interfaces";
import { FiCopy } from "react-icons/fi";
import { CopyButton } from "@/components/CopyButton";
import { SEARCH_PARAM_NAMES } from "../searchParams";
import { usePopup } from "@/components/admin/connectors/Popup";
import { structureValue } from "@/lib/llm/utils";
import { LlmDescriptor } from "@/lib/hooks";
import { Separator } from "@/components/ui/separator";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";

function buildShareLink(chatSessionId: string) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/chat/shared/${chatSessionId}`;
}

async function generateShareLink(chatSessionId: string) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "public" }),
  });

  if (response.ok) {
    return buildShareLink(chatSessionId);
  }
  return null;
}

async function generateSeedLink(
  message?: string,
  assistantId?: number,
  modelOverride?: LlmDescriptor
) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const model = modelOverride
    ? structureValue(
        modelOverride.name,
        modelOverride.provider,
        modelOverride.modelName
      )
    : null;
  return `${baseUrl}/chat${
    message
      ? `?${SEARCH_PARAM_NAMES.USER_PROMPT}=${encodeURIComponent(message)}`
      : ""
  }${
    assistantId
      ? `${message ? "&" : "?"}${SEARCH_PARAM_NAMES.PERSONA_ID}=${assistantId}`
      : ""
  }${
    model
      ? `${message || assistantId ? "&" : "?"}${
          SEARCH_PARAM_NAMES.STRUCTURED_MODEL
        }=${encodeURIComponent(model)}`
      : ""
  }${message ? `&${SEARCH_PARAM_NAMES.SEND_ON_LOAD}=true` : ""}`;
}

async function deleteShareLink(chatSessionId: string) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "private" }),
  });

  return response.ok;
}

export function ShareChatSessionModal({
  chatSessionId,
  existingSharedStatus,
  onShare,
  onClose,
  message,
  assistantId,
  modelOverride,
}: {
  chatSessionId: string;
  existingSharedStatus: ChatSessionSharedStatus;
  onShare?: (shared: boolean) => void;
  onClose: () => void;
  message?: string;
  assistantId?: number;
  modelOverride?: LlmDescriptor;
}) {
  const [shareLink, setShareLink] = useState<string>(
    existingSharedStatus === ChatSessionSharedStatus.Public
      ? buildShareLink(chatSessionId)
      : ""
  );

  const { popup, setPopup } = usePopup();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <>
      {popup}
      <Modal onOutsideClick={onClose} width="w-full max-w-3xl">
        <>
          <div className="flex mb-4">
            <h2 className="text-2xl text-text-darker font-bold flex my-auto">
              {i18n.t(k.SHARE_LINK_TO_CHAT)}
            </h2>
          </div>

          <div className="flex mt-2">
            {shareLink ? (
              <div>
                <Text>{i18n.t(k.THIS_CHAT_SESSION_IS_CURRENTLY)}</Text>

                <div className="flex mt-2">
                  <CopyButton content={shareLink} />
                  <a
                    href={shareLink}
                    target="_blank"
                    className="underline text-link mt-1 ml-1 text-sm my-auto"
                    rel="noreferrer"
                  >
                    {shareLink}
                  </a>
                </div>

                <Separator />

                <Text className="mb-4">
                  {i18n.t(k.CLICK_THE_BUTTON_BELOW_TO_MAKE)}
                </Text>

                <Button
                  onClick={async () => {
                    const success = await deleteShareLink(chatSessionId);
                    if (success) {
                      setShareLink("");
                      onShare && onShare(false);
                    } else {
                      alert(i18n.t(k.FAILED_TO_DELETE_SHARE_LINK));
                    }
                  }}
                  size="sm"
                  variant="destructive"
                >
                  {i18n.t(k.DELETE_SHARE_LINK)}
                </Button>
              </div>
            ) : (
              <div>
                <Callout type="warning" title="Предупреждение" className="mb-4">
                  {i18n.t(k.PLEASE_MAKE_SURE_THAT_ALL_CONT)}
                </Callout>
                <div className="flex w-full justify-between">
                  <Button
                    icon={FiCopy}
                    onClick={async () => {
                      // NOTE: for "insecure" non-https setup, the `navigator.clipboard.writeText` may fail
                      // as the browser may not allow the clipboard to be accessed.
                      try {
                        const shareLink = await generateShareLink(
                          chatSessionId
                        );
                        if (!shareLink) {
                          alert(i18n.t(k.FAILED_TO_GENERATE_SHARE_LINK));
                        } else {
                          setShareLink(shareLink);
                          onShare && onShare(true);
                          navigator.clipboard.writeText(shareLink);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    {i18n.t(k.GENERATE_AND_COPY_SHARE_LINK)}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <AdvancedOptionsToggle
            showAdvancedOptions={showAdvancedOptions}
            setShowAdvancedOptions={setShowAdvancedOptions}
            title="Расширенные настройки"
          />

          {showAdvancedOptions && (
            <>
              <div className="mb-4">
                <Callout type="notice" title="Seed New Chat">
                  {i18n.t(k.GENERATE_A_LINK_TO_A_NEW_CHAT)}
                </Callout>
              </div>
              <div className="flex w-full justify-between">
                <Button
                  icon={FiCopy}
                  onClick={async () => {
                    try {
                      const seedLink = await generateSeedLink(
                        message,
                        assistantId,
                        modelOverride
                      );
                      if (!seedLink) {
                        setPopup({
                          message: i18n.t(k.FAILED_TO_GENERATE_SEED_LINK),
                          type: "error",
                        });
                      } else {
                        navigator.clipboard.writeText(seedLink);
                        setPopup({
                          message: i18n.t(k.LINK_COPIED_TO_CLIPBOARD),
                          type: "success",
                        });
                      }
                    } catch (e) {
                      console.error(e);
                      alert("Failed to generate or copy link.");
                    }
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {i18n.t(k.GENERATE_AND_COPY_SEED_LINK)}
                </Button>
              </div>
            </>
          )}
        </>
      </Modal>
    </>
  );
}

"use client";
import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InvitedUserTable from "@/components/admin/users/InvitedUserTable";
import SignedUpUserTable from "@/components/admin/users/SignedUpUserTable";

import { FiPlusSquare } from "react-icons/fi";
import { Modal } from "@/components/Modal";
import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup, PopupSpec } from "@/components/admin/connectors/Popup";
import { UsersIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { ErrorCallout } from "@/components/ErrorCallout";
import BulkAdd from "@/components/admin/users/BulkAdd";
import Text from "@/components/ui/text";
import { InvitedUserSnapshot } from "@/lib/types";
import { SearchBar } from "@/components/search/SearchBar";
import { ConfirmEntityModal } from "@/components/modals/ConfirmEntityModal";
import { NEXT_PUBLIC_CLOUD_ENABLED } from "@/lib/constants";
import PendingUsersTable from "@/components/admin/users/PendingUsersTable";
import { useUser } from "@/components/user/UserProvider";
const UsersTables = ({
  q,
  setPopup,
}: {
  q: string;
  setPopup: (spec: PopupSpec) => void;
}) => {
  const {
    data: invitedUsers,
    error: invitedUsersError,
    isLoading: invitedUsersLoading,
    mutate: invitedUsersMutate,
  } = useSWR<InvitedUserSnapshot[]>(
    "/api/manage/users/invited",
    errorHandlingFetcher
  );

  const { data: validDomains, error: domainsError } = useSWR<string[]>(
    "/api/manage/admin/valid-domains",
    errorHandlingFetcher
  );

  const {
    data: pendingUsers,
    error: pendingUsersError,
    isLoading: pendingUsersLoading,
    mutate: pendingUsersMutate,
  } = useSWR<InvitedUserSnapshot[]>(
    NEXT_PUBLIC_CLOUD_ENABLED ? "/api/tenants/users/pending" : null,
    errorHandlingFetcher
  );
  // Show loading animation only during the initial data fetch
  if (!validDomains) {
    return <ThreeDotsLoader />;
  }

  if (domainsError) {
    return (
      <ErrorCallout
        errorTitle="Ошибка загрузки допустимых доменов"
        errorMsg={domainsError?.info?.detail}
      />
    );
  }

  return (
    <Tabs defaultValue="current">
      <TabsList>
        <TabsTrigger value="current">{i18n.t(k.CURRENT_USERS)}</TabsTrigger>
        <TabsTrigger value="invited">{i18n.t(k.INVITED_USERS)}</TabsTrigger>
        {NEXT_PUBLIC_CLOUD_ENABLED && (
          <TabsTrigger value="pending">{i18n.t(k.PENDING_USERS)}</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="current">
        <Card>
          <CardHeader>
            <CardTitle>{i18n.t(k.CURRENT_USERS)}</CardTitle>
          </CardHeader>
          <CardContent>
            <SignedUpUserTable
              invitedUsers={invitedUsers || []}
              setPopup={setPopup}
              q={q}
              invitedUsersMutate={invitedUsersMutate}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="invited">
        <Card>
          <CardHeader>
            <CardTitle>{i18n.t(k.INVITED_USERS)}</CardTitle>
          </CardHeader>
          <CardContent>
            <InvitedUserTable
              users={invitedUsers || []}
              setPopup={setPopup}
              mutate={invitedUsersMutate}
              error={invitedUsersError}
              isLoading={invitedUsersLoading}
              q={q}
            />
          </CardContent>
        </Card>
      </TabsContent>
      {NEXT_PUBLIC_CLOUD_ENABLED && (
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>{i18n.t(k.PENDING_USERS)}</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingUsersTable
                users={pendingUsers || []}
                setPopup={setPopup}
                mutate={pendingUsersMutate}
                error={pendingUsersError}
                isLoading={pendingUsersLoading}
                q={q}
              />
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
};

const SearchableTables = () => {
  const { popup, setPopup } = usePopup();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");

  return (
    <div>
      {popup}
      <div className="flex flex-col gap-y-4">
        <div className="flex gap-x-4">
          <AddUserButton setPopup={setPopup} />
          <div className="flex-grow">
            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={() => setQ(query)}
            />
          </div>
        </div>
        <UsersTables q={q} setPopup={setPopup} />
      </div>
    </div>
  );
};

const AddUserButton = ({
  setPopup,
}: {
  setPopup: (spec: PopupSpec) => void;
}) => {
  const [modal, setModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: invitedUsers } = useSWR<InvitedUserSnapshot[]>(
    "/api/manage/users/invited",
    errorHandlingFetcher
  );

  const onSuccess = () => {
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/manage/users")
    );
    setModal(false);
    setPopup({
      message: "Пользователи приглашены!",
      type: "success",
    });
  };

  const onFailure = async (res: Response) => {
    const error = (await res.json()).detail;
    setPopup({
      message: `Не удалось пригласить пользователей - ${error}`,
      type: "error",
    });
  };

  const handleInviteClick = () => {
    if (
      !NEXT_PUBLIC_CLOUD_ENABLED &&
      invitedUsers &&
      invitedUsers.length === 0
    ) {
      setShowConfirmation(true);
    } else {
      setModal(true);
    }
  };

  const handleConfirmFirstInvite = () => {
    setShowConfirmation(false);
    setModal(true);
  };

  return (
    <>
      <Button className="my-auto w-fit" onClick={handleInviteClick}>
        <div className="flex">
          <FiPlusSquare className="my-auto mr-2" />
          {i18n.t(k.INVITE_USERS)}
        </div>
      </Button>

      {showConfirmation && (
        <ConfirmEntityModal
          entityType="Приглашение первого пользователя"
          entityName="ваша логика доступа"
          onClose={() => setShowConfirmation(false)}
          onSubmit={handleConfirmFirstInvite}
          additionalDetails="После приглашения первого пользователя, только приглашенные пользователи смогут присоединиться к этой платформе. Это мера безопасности для контроля доступа к вашей команде."
          actionButtonText="Продолжить"
          variant="action"
        />
      )}

      {modal && (
        <Modal
          title="Массовое добавление пользователей"
          onOutsideClick={() => setModal(false)}
        >
          <div className="flex flex-col gap-y-4">
            <Text className="font-medium text-base">
              {i18n.t(k.ADD_THE_EMAIL_ADDRESSES_TO_IMP)}
            </Text>
            <BulkAdd onSuccess={onSuccess} onFailure={onFailure} />
          </div>
        </Modal>
      )}
    </>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Управление пользователями"
        icon={<UsersIcon size={32} />}
      />
      <SearchableTables />
    </div>
  );
};

export default Page;

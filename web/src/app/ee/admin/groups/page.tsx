"use client";
import i18n from "@/i18n/init";
import k from "./../../../../i18n/keys";

import { GroupsIcon } from "@/components/icons/icons";
import { UserGroupsTable } from "./UserGroupsTable";
import { UserGroupCreationForm } from "./UserGroupCreationForm";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { ThreeDotsLoader } from "@/components/Loading";
import { useConnectorStatus, useUserGroups, useUsers } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button } from "@/components/ui/button";

import { useUser } from "@/components/user/UserProvider";
import CreateButton from "@/components/ui/createButton";

const Main = () => {
  const { popup, setPopup } = usePopup();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error, refreshUserGroups } = useUserGroups();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorStatus();

  const {
    data: users,
    isLoading: userIsLoading,
    error: usersError,
  } = useUsers({ includeApiKeys: true });

  const { isAdmin } = useUser();

  if (isLoading || isCCPairsLoading || userIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !data) {
    return <div className="text-red-600">{i18n.t(k.ERROR_LOADING_USERS)}</div>;
  }

  if (ccPairsError || !ccPairs) {
    return (
      <div className="text-red-600">{i18n.t(k.ERROR_LOADING_CONNECTORS)}</div>
    );
  }

  if (usersError || !users) {
    return <div className="text-red-600">{i18n.t(k.ERROR_LOADING_USERS)}</div>;
  }

  return (
    <>
      {popup}
      {isAdmin && (
        <CreateButton
          onClick={() => setShowForm(true)}
          text="Создать новую группу"
        />
      )}
      {data.length > 0 && (
        <div className="mt-2">
          <UserGroupsTable
            userGroups={data}
            setPopup={setPopup}
            refresh={refreshUserGroups}
          />
        </div>
      )}
      {showForm && (
        <UserGroupCreationForm
          onClose={() => {
            refreshUserGroups();
            setShowForm(false);
          }}
          setPopup={setPopup}
          users={users.accepted}
          ccPairs={ccPairs}
        />
      )}
    </>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Управление группами пользователей"
        icon={<GroupsIcon size={32} />}
      />

      <Main />
    </div>
  );
};

export default Page;

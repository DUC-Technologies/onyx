"use client";

import { useTranslation } from "@/hooks/useTranslation";
import k from "../../../../../i18n/keys";
import { AdminPageTitle } from "@/components/admin/Title";
import { BookOpen, InfoIcon } from "@/components/icons/icons";
import { useUserGroups } from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Card } from "@tremor/react";
import { BackButton } from "@/components/BackButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useRouter } from "next/navigation";
import { KnowledgeMapCreationForm } from "./KnowledgeMapCreationForm";
import { useDocumentSets } from "../../sets/hooks";

function Main() {
  const { t } = useTranslation();
  const { popup, setPopup } = usePopup();
  const router = useRouter();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useDocumentSets();

  // EE only
  const { data: userGroups, isLoading: userGroupsIsLoading } = useUserGroups();

  if (isCCPairsLoading || userGroupsIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (ccPairsError || !ccPairs) {
    return (
      <ErrorCallout
        errorTitle={t(k.FAILED_TO_FETCH_KNOWLEDGE_MAPS)}
        errorMsg={ccPairsError}
      />
    );
  }

  return (
    <>
      {popup}

      <Card>
        <KnowledgeMapCreationForm
          ccPairs={ccPairs}
          userGroups={userGroups}
          onClose={() => {
            router.push("/admin/documents/knowledge_maps");
          }}
          setPopup={setPopup}
        />
      </Card>
    </>
  );
}

const Page = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto">
      <BackButton />

      <AdminPageTitle
        icon={<BookOpen size={32} />}
        title={t(k.NEW_KNOWLEDGE_MAP)}
      />

      <Main />
    </div>
  );
};

export default Page;

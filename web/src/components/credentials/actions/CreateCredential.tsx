import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ValidSources } from "@/lib/types";
import { FaAccusoft } from "react-icons/fa";
import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { getSourceDocLink } from "@/lib/sources";
import { Connector } from "@/lib/connectors/connectors";
import {
  Credential,
  credentialTemplates,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";
import { PlusCircleIcon } from "../../icons/icons";
import { GmailMain } from "@/app/admin/connectors/[connector]/pages/gmail/GmailPage";
import { ActionType, dictionaryType } from "../types";
import { createValidationSchema } from "../lib";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import {
  IsPublicGroupSelectorFormType,
  IsPublicGroupSelector,
} from "@/components/IsPublicGroupSelector";
import { useUser } from "@/components/user/UserProvider";
import CardSection from "@/components/admin/CardSection";

const CreateButton = ({
  onClick,
  isSubmitting,
  isAdmin,
  groups,
}: {
  onClick: () => void;
  isSubmitting: boolean;
  isAdmin: boolean;
  groups: number[];
}) => (
  <div className="flex justify-end w-full">
    <Button
      onClick={onClick}
      type="button"
      disabled={isSubmitting || (!isAdmin && groups.length === 0)}
    >
      <PlusCircleIcon className="h-4 w-4" />
      {i18n.t(k.CREATE1)}
    </Button>
  </div>
);

type formType = IsPublicGroupSelectorFormType & {
  name: string;
  [key: string]: any; // For additional credential fields
};

export default function CreateCredential({
  hideSource,
  sourceType,
  setPopup,
  close,
  onClose = () => null,
  onSwitch,
  onSwap = async () => null,
  swapConnector,
  refresh = () => null,
}: {
  // Source information
  hideSource?: boolean; // hides docs link
  sourceType: ValidSources;
  setPopup: (popupSpec: PopupSpec | null) => void; // Optional toggle- close section after selection?
  close?: boolean; // Special handlers
  onClose?: () => void; // Switch currently selected credential
  onSwitch?: (selectedCredential: Credential<any>) => Promise<void>; // Switch currently selected credential + link with connector
  onSwap?: (selectedCredential: Credential<any>, connectorId: number) => void; // For swapping credentials on selection
  swapConnector?: Connector<any>; // Mutating parent state
  refresh?: () => void;
}) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const { isAdmin } = useUser();
  const handleSubmit = async (
    values: formType,
    formikHelpers: FormikHelpers<formType>,
    action: ActionType
  ) => {
    const { setSubmitting, validateForm } = formikHelpers;

    const errors = await validateForm(values);
    if (Object.keys(errors).length > 0) {
      formikHelpers.setErrors(errors);
      return;
    }

    setSubmitting(true);
    formikHelpers.setSubmitting(true);

    const { name, is_public, groups, ...credentialValues } = values;

    const filteredCredentialValues = Object.fromEntries(
      Object.entries(credentialValues).filter(
        ([_, value]) => value !== null && value !== ""
      )
    );

    try {
      const response = await submitCredential({
        credential_json: filteredCredentialValues,
        admin_public: true,
        curator_public: is_public,
        groups: groups,
        name: name,
        source: sourceType,
      });

      const { message, isSuccess, credential } = response;

      if (!credential) {
        throw new Error("No credential returned");
      }

      if (isSuccess && swapConnector) {
        if (action === "createAndSwap") {
          onSwap(credential, swapConnector.id);
        } else {
          setPopup({ type: "success", message: "Created new credential!" });
          setTimeout(() => setPopup(null), 4000);
        }
        onClose();
      } else {
        setPopup({ message, type: isSuccess ? "success" : "error" });
      }

      if (close) {
        onClose();
      }
      await refresh();

      if (onSwitch) {
        onSwitch(response?.credential!);
      }
    } catch (error) {
      console.error("Error submitting credential:", error);
      setPopup({ message: "Error submitting credential", type: "error" });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  if (sourceType == "gmail") {
    return <GmailMain />;
  }

  const credentialTemplate: dictionaryType = credentialTemplates[sourceType];
  const validationSchema = createValidationSchema(credentialTemplate);

  return (
    <Formik
      initialValues={
        {
          name: "",
          is_public: isAdmin || !isPaidEnterpriseFeaturesEnabled,
          groups: [],
        } as formType
      }
      validationSchema={validationSchema}
      onSubmit={() => {}} // This will be overridden by our custom submit handlers
    >
      {(formikProps) => (
        <Form className="w-full flex items-stretch">
          {!hideSource && (
            <p className="text-sm">
              {i18n.t(k.CHECK_OUR)}
              <a
                className="text-blue-600 hover:underline"
                target="_blank"
                href={getSourceDocLink(sourceType) || ""}
              >
                {" "}
                {i18n.t(k.DOCS)}{" "}
              </a>
              {i18n.t(k.FOR_INFORMATION_ON_SETTING_UP)}
            </p>
          )}
          <CardSection className="w-full items-start dark:bg-neutral-900 mt-4 flex flex-col gap-y-6">
            <TextFormField
              name="name"
              placeholder="(Необязательно) Название учетных данных.."
              label="Название:"
            />

            {Object.entries(credentialTemplate).map(([key, val]) => {
              if (typeof val === "boolean") {
                return (
                  <BooleanFormField
                    key={key}
                    name={key}
                    label={getDisplayNameForCredentialKey(key)}
                  />
                );
              }
              return (
                <TextFormField
                  key={key}
                  name={key}
                  placeholder={val}
                  label={getDisplayNameForCredentialKey(key)}
                  type={
                    key.toLowerCase().includes(i18n.t(k.TOKEN)) ||
                    key.toLowerCase().includes(i18n.t(k.PASSWORD))
                      ? i18n.t(k.PASSWORD)
                      : i18n.t(k.TEXT)
                  }
                />
              );
            })}
            {!swapConnector && (
              <div className="mt-4 flex w-full flex-col sm:flex-row justify-between items-end">
                <div className="w-full sm:w-3/4 mb-4 sm:mb-0">
                  {isPaidEnterpriseFeaturesEnabled && (
                    <div className="flex flex-col items-start">
                      {isAdmin && (
                        <AdvancedOptionsToggle
                          showAdvancedOptions={showAdvancedOptions}
                          setShowAdvancedOptions={setShowAdvancedOptions}
                        />
                      )}
                      {(showAdvancedOptions || !isAdmin) && (
                        <IsPublicGroupSelector
                          formikProps={formikProps}
                          objectName="credential"
                          publicToWhom="Curators"
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-1/4">
                  <CreateButton
                    onClick={() =>
                      handleSubmit(formikProps.values, formikProps, "create")
                    }
                    isSubmitting={formikProps.isSubmitting}
                    isAdmin={isAdmin}
                    groups={formikProps.values.groups}
                  />
                </div>
              </div>
            )}
          </CardSection>
          {swapConnector && (
            <div className="flex gap-x-4 w-full mt-8 justify-end">
              <Button
                className="bg-rose-500 hover:bg-rose-400 border-rose-800"
                onClick={() =>
                  handleSubmit(formikProps.values, formikProps, "createAndSwap")
                }
                type="button"
                disabled={formikProps.isSubmitting}
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaAccusoft />
                  <p>{i18n.t(k.CREATE1)}</p>
                </div>
              </Button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}

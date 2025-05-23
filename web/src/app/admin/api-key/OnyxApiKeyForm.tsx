import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import { Form, Formik } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  BooleanFormField,
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { createApiKey, updateApiKey } from "./lib";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Text from "@/components/ui/text";
import { USER_ROLE_LABELS, UserRole } from "@/lib/types";
import { APIKey } from "./types";

interface OnyxApiKeyFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onCreateApiKey: (apiKey: APIKey) => void;
  apiKey?: APIKey;
}

export const OnyxApiKeyForm = ({
  onClose,
  setPopup,
  onCreateApiKey,
  apiKey,
}: OnyxApiKeyFormProps) => {
  const isUpdate = apiKey !== undefined;

  return (
    <Modal onOutsideClick={onClose} width="w-2/6">
      <>
        <h2 className="text-xl font-bold flex">
          {isUpdate ? i18n.t(k.UPDATE_API_KEY) : i18n.t(k.CREATE_A_NEW_API_KEY)}
        </h2>

        <Separator />

        <Formik
          initialValues={{
            name: apiKey?.api_key_name || "",
            role: apiKey?.api_key_role || UserRole.BASIC.toString(),
          }}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);

            // Prepare the payload with the UserRole
            const payload = {
              ...values,
              role: values.role as UserRole, // Assign the role directly as a UserRole type
            };

            let response;
            if (isUpdate) {
              response = await updateApiKey(apiKey.api_key_id, payload);
            } else {
              response = await createApiKey(payload);
            }
            formikHelpers.setSubmitting(false);
            if (response.ok) {
              setPopup({
                message: isUpdate
                  ? i18n.t(k.SUCCESSFULLY_UPDATED_API_KEY)
                  : i18n.t(k.SUCCESSFULLY_CREATED_API_KEY),

                type: "success",
              });
              if (!isUpdate) {
                onCreateApiKey(await response.json());
              }
              onClose();
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              setPopup({
                message: isUpdate
                  ? `${i18n.t(k.ERROR_UPDATING_API_KEY)} ${errorMsg}`
                  : `${i18n.t(k.ERROR_CREATING_API_KEY)} ${errorMsg}`,
                type: "error",
              });
            }
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="w-full overflow-visible">
              <Text className="mb-4 text-lg">
                {i18n.t(k.CHOOSE_A_MEMORABLE_NAME_FOR_YO)}
              </Text>

              <TextFormField
                name="name"
                label="Название (необязательно):"
                autoCompleteDisabled={true}
              />

              <SelectorFormField
                // defaultValue is managed by Formik
                label="Роль:"
                subtext="Выберите роль для этого ключа API. Ограниченный доступ имеет доступ к простым публичным API. Базовый доступ имеет доступ к API обычного пользователя. Администратор имеет доступ к API уровня администратора."
                name="role"
                options={[
                  {
                    name: USER_ROLE_LABELS[UserRole.LIMITED],
                    value: UserRole.LIMITED.toString(),
                  },
                  {
                    name: USER_ROLE_LABELS[UserRole.BASIC],
                    value: UserRole.BASIC.toString(),
                  },
                  {
                    name: USER_ROLE_LABELS[UserRole.ADMIN],
                    value: UserRole.ADMIN.toString(),
                  },
                ]}
              />

              <Button
                type="submit"
                size="sm"
                variant="submit"
                disabled={isSubmitting}
              >
                {isUpdate ? i18n.t(k.UPDATE1) : i18n.t(k.CREATE)}
              </Button>
            </Form>
          )}
        </Formik>
      </>
    </Modal>
  );
};

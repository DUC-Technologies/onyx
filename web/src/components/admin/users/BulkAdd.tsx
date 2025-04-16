"use client";
import i18n from "i18next";
import k from "./../../../i18n/keys";

import { withFormik, FormikProps, FormikErrors, Form, Field } from "formik";
import { Button } from "@/components/ui/button";

const WHITESPACE_SPLIT = /\s+/;
const EMAIL_REGEX = /[^@]+@[^.]+\.[^.]/;

const addUsers = async (url: string, { arg }: { arg: Array<string> }) => {
  return await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emails: arg }),
  });
};

interface FormProps {
  onSuccess: () => void;
  onFailure: (res: Response) => void;
}

interface FormValues {
  emails: string;
}

const AddUserFormRenderer = ({
  touched,
  errors,
  isSubmitting,
  handleSubmit,
}: FormikProps<FormValues>) => (
  <Form className="w-full" onSubmit={handleSubmit}>
    <Field
      id="emails"
      name="emails"
      as="textarea"
      className="w-full p-4"
      onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      }}
    />

    {touched.emails && errors.emails && (
      <div className="text-error text-sm">{errors.emails}</div>
    )}
    <Button
      className="mx-auto"
      variant="submit"
      size="sm"
      type="submit"
      disabled={isSubmitting}
    >
      {i18n.t(k.ADD)}
    </Button>
  </Form>
);

const AddUserForm = withFormik<FormProps, FormValues>({
  mapPropsToValues: (props) => {
    return {
      emails: i18n.t(k._1),
    };
  },
  validate: (values: FormValues): FormikErrors<FormValues> => {
    const emails = values.emails.trim().split(WHITESPACE_SPLIT);
    if (!emails.some(Boolean)) {
      return { emails: i18n.t(k.REQUIRED) };
    }
    for (let email of emails) {
      if (!email.match(EMAIL_REGEX)) {
        return { emails: `${email} is not a valid email` };
      }
    }
    return {};
  },
  handleSubmit: async (values: FormValues, formikBag) => {
    const emails = values.emails.trim().split(WHITESPACE_SPLIT);
    await addUsers("/api/manage/admin/users", { arg: emails }).then((res) => {
      if (res.ok) {
        formikBag.props.onSuccess();
      } else {
        formikBag.props.onFailure(res);
      }
    });
  },
})(AddUserFormRenderer);

const BulkAdd = ({ onSuccess, onFailure }: FormProps) => {
  return <AddUserForm onSuccess={onSuccess} onFailure={onFailure} />;
};

export default BulkAdd;

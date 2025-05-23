import i18n from "@/i18n/init";
import k from "./../../../../../../i18n/keys";
import CredentialSubText from "@/components/credentials/CredentialFields";
import { StringWithDescription } from "@/lib/connectors/connectors";
import { Field } from "formik";

export default function SelectInput({
  name,
  optional,
  description,
  options,
  label,
}: {
  name: string;
  optional?: boolean;
  description?: string;
  options: StringWithDescription[];
  label?: string;
}) {
  return (
    <>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-text-700 mb-1"
      >
        {label}
        {optional && (
          <span className="text-text-500 ml-1">{i18n.t(k.OPTIONAL)}</span>
        )}
      </label>
      {description && <CredentialSubText>{description}</CredentialSubText>}

      <Field
        as="select"
        name={name}
        className="w-full p-2 border bg-input border-border-medium rounded-md bg-black focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">{i18n.t(k.SELECT_AN_OPTION)}</option>
        {options?.map((option: any) => (
          <option key={option.name} value={option.value}>
            {option.name}
          </option>
        ))}
      </Field>
    </>
  );
}

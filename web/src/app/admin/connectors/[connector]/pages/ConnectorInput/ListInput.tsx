import i18n from "@/i18n/init";
import k from "./../../../../../../i18n/keys";
import React from "react";
import { ListOption } from "@/lib/connectors/connectors";
import { TextArrayField } from "@/components/admin/connectors/Field";
import { useFormikContext } from "formik";

interface ListInputProps {
  name: string;
  label: string | ((credential: any) => string);
  description: string | ((credential: any) => string);
}

const ListInput: React.FC<ListInputProps> = ({ name, label, description }) => {
  const { values } = useFormikContext<any>();
  return (
    <TextArrayField
      name={name}
      label={typeof label === "function" ? label(null) : label}
      values={values}
      subtext={
        typeof description === "function" ? description(null) : description
      }
      placeholder={`${i18n.t(k.ENTER)} ${
        typeof label === "function" ? label(null) : label.toLowerCase()
      }`}
    />
  );
};

export default ListInput;

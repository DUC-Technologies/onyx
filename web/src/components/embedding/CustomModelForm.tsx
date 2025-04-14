import i18n from "i18next";
import k from "./../../i18n/keys";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Button } from "@/components/ui/button";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { HostedEmbeddingModel } from "./interfaces";

export function CustomModelForm({
  onSubmit,
}: {
  onSubmit: (model: HostedEmbeddingModel) => void;
}) {
  return (
    <div>
      <Formik
        initialValues={{
          model_name: "",
          model_dim: "",
          query_prefix: "",
          passage_prefix: "",
          description: "",
          normalize: true,
        }}
        validationSchema={Yup.object().shape({
          model_name: Yup.string().required(
            "Please enter the name of the Embedding Model"
          ),
          model_dim: Yup.number().required(
            "Please enter the dimensionality of the embeddings generated by the model"
          ),
          query_prefix: Yup.string(),
          passage_prefix: Yup.string(),
          normalize: Yup.boolean().required(),
        })}
        onSubmit={async (values, formikHelpers) => {
          onSubmit({
            ...values,
            model_dim: parseInt(values.model_dim),
            api_key: null,
            provider_type: null,
            index_name: null,
            api_url: null,
          });
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <TextFormField
              name="model_name"
              label="Name:"
              subtext="The name of the model on Hugging Face"
              placeholder="E.g. 'nomic-ai/nomic-embed-text-v1'"
              autoCompleteDisabled={true}
            />

            <TextFormField
              name="model_dim"
              label="Model Dimension:"
              subtext="The dimensionality of the embeddings generated by the model"
              placeholder="E.g. '768'"
              autoCompleteDisabled={true}
              type="number"
            />

            <TextFormField
              min={-1}
              name="description"
              label="Description:"
              subtext="Description of  your model"
              placeholder=""
              autoCompleteDisabled={true}
            />

            <TextFormField
              name="query_prefix"
              label="[Optional] Query Prefix:"
              subtext={
                <>
                  {i18n.t(k.THE_PREFIX_SPECIFIED_BY_THE_MO)}
                  <i>{i18n.t(k.QUERIES)}</i>{" "}
                  {i18n.t(k.BEFORE_PASSING_THEM_TO_THE_MOD)}
                </>
              }
              placeholder="E.g. 'query: '"
              autoCompleteDisabled={true}
            />

            <TextFormField
              name="passage_prefix"
              label="[Optional] Passage Prefix:"
              subtext={
                <>
                  {i18n.t(k.THE_PREFIX_SPECIFIED_BY_THE_MO)}
                  <i>{i18n.t(k.PASSAGES)}</i>{" "}
                  {i18n.t(k.BEFORE_PASSING_THEM_TO_THE_MOD)}
                </>
              }
              placeholder="E.g. 'passage: '"
              autoCompleteDisabled={true}
            />

            <BooleanFormField
              removeIndent
              name="normalize"
              label="Normalize Embeddings"
              subtext="Whether or not to normalize the embeddings generated by the model. When in doubt, leave this checked."
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-64 mx-auto"
            >
              {i18n.t(k.CHOOSE)}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}

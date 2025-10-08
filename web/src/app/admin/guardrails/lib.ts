import { APIKeyArgs } from "./types";

export const createApiKey = async (validatorArgs: APIKeyArgs) => {
  return fetch("/api/validators", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatorArgs),
  });
};

export const updateApiKey = async (
  validatorId: number,
  validatorArgs: APIKeyArgs
) => {
  return fetch(`/api/validators/${validatorId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatorArgs),
  });
};

export const deleteApiKey = async (validatorId: number) => {
  return fetch(`/api/validators/${validatorId}`, {
    method: "DELETE",
  });
};

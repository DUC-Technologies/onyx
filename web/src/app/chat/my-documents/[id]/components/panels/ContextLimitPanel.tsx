import i18n from "@/i18n/init";
import k from "./../../../../../../i18n/keys";
import React, { useState } from "react";
import { Info, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LLMModelDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { ModelSelector } from "./ModelSelector";
import { useChatContext } from "@/components/context/ChatContext";
import { getDisplayNameForModel } from "@/lib/hooks";

interface ContextLimitPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  totalTokens: number;
}

export function ContextLimitPanel({
  isOpen,
  onToggle,
  totalTokens,
}: ContextLimitPanelProps) {
  const { llmProviders } = useChatContext();
  const modelDescriptors = llmProviders.flatMap((provider) =>
    Object.entries(provider.model_token_limits ?? {}).map(
      ([modelName, maxTokens]) => ({
        modelName,
        provider: provider.provider,
        maxTokens,
      })
    )
  );

  return (
    <div className="p-4 border-b border-neutral-300 dark:border-neutral-600">
      <div
        className="flex items-center justify-between text-neutral-900 dark:text-neutral-300 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md p-1"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <Info className="w-5 h-4 mr-3 text-neutral-600 dark:text-neutral-400" />
          <span className="text-sm font-medium leading-tight">
            {i18n.t(k.CONTEXT_LIMIT)}
          </span>
        </div>

        <Button variant="ghost" size="sm" className="w-6 h-6 p-0 rounded-full">
          {isOpen ? (
            <ChevronDown className="w-[15px] h-3" />
          ) : (
            <ChevronRight className="w-[15px] h-3" />
          )}
        </Button>
      </div>
      {isOpen && (
        <div className="mt-3 mb-3 text-neutral-600 dark:text-neutral-400 text-sm">
          <p className="mb-2">{i18n.t(k.SHOWS_HOW_MUCH_OF_EACH_MODEL_S)}</p>
          <p className="font-medium">
            {i18n.t(k.TOTAL_TOKENS_IN_THIS_GROUP)}{" "}
            <span className="text-neutral-900 dark:text-neutral-300">
              {totalTokens.toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-normal default-scrollbar leading-tight max-h-60 overflow-y-auto pr-1">
          {modelDescriptors.map((model, index) => {
            const tokenPercentage = (totalTokens / model.maxTokens) * 100;
            return (
              <div
                key={`${model.provider}-${model.modelName}`}
                className="mb-4"
              >
                <div className="mb-1.5 flex justify-between">
                  <span className="font-medium">
                    {getDisplayNameForModel(model.modelName)}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-500">
                    {model.maxTokens.toLocaleString()} {i18n.t(k.TOKENS)}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      tokenPercentage > 100
                        ? "bg-red-500 dark:bg-red-600"
                        : tokenPercentage > 80
                        ? "bg-amber-500 dark:bg-amber-600"
                        : "bg-emerald-500 dark:bg-emerald-600"
                    }`}
                    style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                  ></div>
                </div>
                {tokenPercentage > 100 && (
                  <div className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" />{" "}
                    {i18n.t(k.CAPACITY_EXCEEDED_SEARCH)}
                  </div>
                )}
                {tokenPercentage > 80 && tokenPercentage <= 100 && (
                  <div className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center">
                    <Info className="w-3 h-3 mr-1" />{" "}
                    {i18n.t(k.NEAR_CAPACITY_LIMIT)}
                  </div>
                )}
              </div>
            );
          })}
          {modelDescriptors.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 py-2 text-center italic">
              {i18n.t(k.NO_MODELS_AVAILABLE)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

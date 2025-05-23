"use client";
import i18n from "@/i18n/init";
import k from "./../../../../../i18n/keys";

import { Button } from "@/components/ui/button";
import { FiTrash } from "react-icons/fi";
import { deleteCustomTool } from "@/lib/tools/edit";
import { useRouter } from "next/navigation";

export function DeleteToolButton({ toolId }: { toolId: number }) {
  const router = useRouter();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        const response = await deleteCustomTool(toolId);
        if (response.data) {
          router.push(`/admin/tools?u=${Date.now()}`);
        } else {
          alert(`${i18n.t(k.FAILED_TO_DELETE_TOOL)} ${response.error}`);
        }
      }}
      icon={FiTrash}
    >
      {i18n.t(k.DELETE)}
    </Button>
  );
}

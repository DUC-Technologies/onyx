import i18n from "@/i18n/init";
import k from "./../../i18n/keys";
import { buildCCPairInfoUrl } from "@/app/admin/connector/[ccPairId]/lib";
import { PageSelector } from "@/components/PageSelector";
import { IndexAttemptStatus } from "@/components/Status";
import { deleteCCPair } from "@/lib/documentDeletion";
import { FailedConnectorIndexingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Text from "@/components/ui/text";
import Link from "next/link";
import { useState } from "react";
import { FiLink, FiMaximize2, FiTrash } from "react-icons/fi";
import { mutate } from "swr";
import { PopupSpec } from "../admin/connectors/Popup";

export function FailedReIndexAttempts({
  failedIndexingStatuses,
  setPopup,
}: {
  failedIndexingStatuses: FailedConnectorIndexingStatus[];
  setPopup: (popupSpec: PopupSpec | null) => void;
}) {
  const numToDisplay = 10;
  const [page, setPage] = useState(1);

  const anyDeletable = failedIndexingStatuses.some(
    (status) => status.is_deletable
  );

  return (
    <div className="mt-6 mb-8 p-4 border border-red-300 rounded-lg bg-red-50">
      <Text className="text-red-700 font-semibold mb-2">
        {i18n.t(k.FAILED_RE_INDEXING_ATTEMPTS)}
      </Text>
      <Text className="text-red-600 mb-4">
        {i18n.t(k.THE_TABLE_BELOW_SHOWS_ONLY_THE)}
      </Text>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/8 sm:w-1/6">
                {i18n.t(k.CONNECTOR_NAME)}
              </TableHead>
              <TableHead className="w-1/8 sm:w-1/6">
                {i18n.t(k.STATUS)}
              </TableHead>
              <TableHead className="w-4/8 sm:w-2/6">
                {i18n.t(k.ERROR_MESSAGE)}
              </TableHead>
              <TableHead className="w-1/8 sm:w-1/6">
                {i18n.t(k.VISIT_CONNECTOR)}
              </TableHead>
              {anyDeletable && (
                <TableHead className="w-1/8 sm:w-2/6">
                  {i18n.t(k.DELETE_CONNECTOR)}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {failedIndexingStatuses
              .slice(numToDisplay * (page - 1), numToDisplay * page)
              .map((reindexingProgress) => {
                return (
                  <TableRow key={reindexingProgress.name}>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="text-link cursor-pointer flex"
                      >
                        <FiMaximize2 className="my-auto mr-1" />
                        {reindexingProgress.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <IndexAttemptStatus status="failed" />
                    </TableCell>

                    <TableCell>
                      <div>
                        <Text className="flex flex-wrap whitespace-normal">
                          {reindexingProgress.error_msg || "-"}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/connector/${reindexingProgress.cc_pair_id}`}
                        className="ctext-link cursor-pointer flex"
                      >
                        <FiLink className="my-auto mr-1" />
                        {i18n.t(k.VISIT_CONNECTOR)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          deleteCCPair(
                            reindexingProgress.connector_id,
                            reindexingProgress.credential_id,
                            setPopup,
                            () =>
                              mutate(
                                buildCCPairInfoUrl(
                                  reindexingProgress.cc_pair_id
                                )
                              )
                          )
                        }
                        icon={FiTrash}
                        disabled={reindexingProgress.is_deletable}
                      >
                        {i18n.t(k.DELETE)}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(
                failedIndexingStatuses.length / numToDisplay
              )}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import i18n from "@/i18n/init";
import k from "./../../../../i18n/keys";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableHeader,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndexAttemptStatus } from "@/components/Status";
import { timeAgo } from "@/lib/time";
import {
  ConnectorIndexingStatus,
  ConnectorSummary,
  GroupedConnectorSummaries,
  ValidSources,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiChevronRight,
  FiSettings,
  FiLock,
  FiUnlock,
  FiRefreshCw,
  FiPauseCircle,
  FiFilter,
  FiX,
} from "react-icons/fi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SourceIcon } from "@/components/SourceIcon";
import { getSourceDisplayName } from "@/lib/sources";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { Warning } from "@phosphor-icons/react";
import Cookies from "js-cookie";
import { TOGGLED_CONNECTORS_COOKIE_NAME } from "@/lib/constants";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { ConnectorCredentialPairStatus } from "../../connector/[ccPairId]/types";
import { FilterComponent, FilterOptions } from "./FilterComponent";

function SummaryRow({
  source,
  summary,
  isOpen,
  onToggle,
}: {
  source: ValidSources;
  summary: ConnectorSummary;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const activePercentage = (summary.active / summary.count) * 100;
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  return (
    <TableRow
      onClick={onToggle}
      className="border-border dark:hover:bg-neutral-800 dark:border-neutral-700 group hover:bg-background-settings-hover/20 bg-background-sidebar py-4 rounded-sm !border cursor-pointer"
    >
      <TableCell>
        <div className="text-xl flex items-center truncate ellipsis gap-x-2 font-semibold">
          <div className="cursor-pointer">
            {isOpen ? (
              <FiChevronDown size={20} />
            ) : (
              <FiChevronRight size={20} />
            )}
          </div>
          <SourceIcon iconSize={20} sourceType={source} />
          {getSourceDisplayName(source)}
        </div>
      </TableCell>

      <TableCell>
        <div className="text-sm text-neutral-500 dark:text-neutral-300">
          {i18n.t(k.TOTAL_CONNECTORS)}
        </div>
        <div className="text-xl font-semibold">{summary.count}</div>
      </TableCell>

      <TableCell>
        <div className="text-sm text-neutral-500 dark:text-neutral-300">
          {i18n.t(k.ACTIVE_CONNECTORS)}
        </div>
        <p className="flex text-xl mx-auto font-semibold items-center text-lg mt-1">
          {summary.active}
          {i18n.t(k._6)}
          {summary.count}
        </p>
      </TableCell>

      {isPaidEnterpriseFeaturesEnabled && (
        <TableCell>
          <div className="text-sm text-neutral-500 dark:text-neutral-300">
            {i18n.t(k.PUBLIC_CONNECTORS)}
          </div>
          <p className="flex text-xl mx-auto font-semibold items-center text-lg mt-1">
            {summary.public}
            {i18n.t(k._6)}
            {summary.count}
          </p>
        </TableCell>
      )}

      <TableCell>
        <div className="text-sm text-neutral-500 dark:text-neutral-300">
          {i18n.t(k.TOTAL_DOCS_INDEXED)}
        </div>
        <div className="text-xl font-semibold">
          {summary.totalDocsIndexed.toLocaleString()}
        </div>
      </TableCell>

      <TableCell>
        <div className="text-sm text-neutral-500 dark:text-neutral-300">
          {i18n.t(k.ERRORS)}
        </div>

        <div className="flex items-center text-lg gap-x-1 font-semibold">
          {summary.errors > 0 && <Warning className="text-error h-6 w-6" />}
          {summary.errors}
        </div>
      </TableCell>

      <TableCell />
    </TableRow>
  );
}

function ConnectorRow({
  ccPairsIndexingStatus,
  invisible,
  isEditable,
}: {
  ccPairsIndexingStatus: ConnectorIndexingStatus<any, any>;
  invisible?: boolean;
  isEditable: boolean;
}) {
  const router = useRouter();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const handleManageClick = (e: any) => {
    e.stopPropagation();
    router.push(`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`);
  };

  const getActivityBadge = () => {
    if (
      ccPairsIndexingStatus.cc_pair_status ===
      ConnectorCredentialPairStatus.DELETING
    ) {
      return <Badge variant="destructive">{i18n.t(k.DELETING)}</Badge>;
    } else if (
      ccPairsIndexingStatus.cc_pair_status ===
      ConnectorCredentialPairStatus.PAUSED
    ) {
      return (
        <Badge icon={FiPauseCircle} variant="paused">
          {i18n.t(k.PAUSED)}
        </Badge>
      );
    } else if (
      ccPairsIndexingStatus.cc_pair_status ===
      ConnectorCredentialPairStatus.INVALID
    ) {
      return (
        <Badge
          tooltip="Коннектор находится в недопустимом состоянии. Пожалуйста, обновите учетные данные или создайте новый коннектор."
          circle
          variant="invalid"
        >
          {i18n.t(k.INVALID)}
        </Badge>
      );
    }

    // ACTIVE case
    switch (ccPairsIndexingStatus.last_status) {
      case "in_progress":
        return (
          <Badge circle variant="success">
            {i18n.t(k.INDEXING)}
          </Badge>
        );

      case "not_started":
        return (
          <Badge circle variant="not_started">
            {i18n.t(k.SCHEDULED)}
          </Badge>
        );

      default:
        return (
          <Badge circle variant="success">
            {i18n.t(k.ACTIVE)}
          </Badge>
        );
    }
  };

  return (
    <TableRow
      className={`
border border-border dark:border-neutral-700
        hover:bg-accent-background ${
          invisible
            ? "invisible !h-0 !-mb-10 !border-none"
            : "!border border-border dark:border-neutral-700"
        }  w-full cursor-pointer relative `}
      onClick={() => {
        router.push(`/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`);
      }}
    >
      <TableCell className="">
        <p className="lg:w-[200px] xl:w-[400px] inline-block ellipsis truncate">
          {ccPairsIndexingStatus.name}
        </p>
      </TableCell>
      <TableCell>
        {timeAgo(ccPairsIndexingStatus?.last_success) || "-"}
      </TableCell>

      <TableCell>{getActivityBadge()}</TableCell>
      {isPaidEnterpriseFeaturesEnabled && (
        <TableCell>
          {ccPairsIndexingStatus.access_type === "public" ? (
            <Badge variant={isEditable ? "success" : "default"} icon={FiUnlock}>
              {i18n.t(k.PUBLIC)}
            </Badge>
          ) : ccPairsIndexingStatus.access_type === "sync" ? (
            <Badge
              variant={isEditable ? "auto-sync" : "default"}
              icon={FiRefreshCw}
            >
              {i18n.t(k.AUTO_SYNC1)}
            </Badge>
          ) : (
            <Badge variant={isEditable ? "private" : "default"} icon={FiLock}>
              {i18n.t(k.PRIVATE1)}
            </Badge>
          )}
        </TableCell>
      )}
      <TableCell>{ccPairsIndexingStatus.docs_indexed}</TableCell>
      <TableCell>
        <IndexAttemptStatus
          status={ccPairsIndexingStatus.last_finished_status || null}
          errorMsg={ccPairsIndexingStatus?.latest_index_attempt?.error_msg}
        />
      </TableCell>
      <TableCell>
        {isEditable && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <FiSettings
                  className="cursor-pointer"
                  onClick={handleManageClick}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{i18n.t(k.MANAGE_CONNECTOR)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}

export function CCPairIndexingStatusTable({
  ccPairsIndexingStatuses,
  editableCcPairsIndexingStatuses,
}: {
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
  editableCcPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const [connectorsToggled, setConnectorsToggled] = useState<
    Record<ValidSources, boolean>
  >(() => {
    const savedState = Cookies.get(TOGGLED_CONNECTORS_COOKIE_NAME);
    return savedState ? JSON.parse(savedState) : {};
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    accessType: null,
    docsCountFilter: {
      operator: null,
      value: null,
    },
    lastStatus: null,
  });

  // Reference to the FilterComponent for resetting its state
  const filterComponentRef = useRef<{
    resetFilters: () => void;
  } | null>(null);

  const {
    groupedStatuses,
    sortedSources,
    groupSummaries,
    filteredGroupedStatuses,
  } = useMemo(() => {
    const grouped: Record<ValidSources, ConnectorIndexingStatus<any, any>[]> =
      {} as Record<ValidSources, ConnectorIndexingStatus<any, any>[]>;

    // First, add editable connectors
    editableCcPairsIndexingStatuses.forEach((status) => {
      const source = status.connector.source;
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].unshift(status);
    });

    // Then, add non-editable connectors
    ccPairsIndexingStatuses.forEach((status) => {
      const source = status.connector.source;
      if (!grouped[source]) {
        grouped[source] = [];
      }
      if (
        !editableCcPairsIndexingStatuses.some(
          (e) => e.cc_pair_id === status.cc_pair_id
        )
      ) {
        grouped[source].push(status);
      }
    });

    const sorted = Object.keys(grouped).sort() as ValidSources[];

    const summaries: GroupedConnectorSummaries =
      {} as GroupedConnectorSummaries;
    sorted.forEach((source) => {
      const statuses = grouped[source];
      summaries[source] = {
        count: statuses.length,
        active: statuses.filter(
          (status) =>
            status.cc_pair_status === ConnectorCredentialPairStatus.ACTIVE
        ).length,
        public: statuses.filter((status) => status.access_type === "public")
          .length,
        totalDocsIndexed: statuses.reduce(
          (sum, status) => sum + status.docs_indexed,
          0
        ),
        errors: statuses.filter(
          (status) => status.last_finished_status === "failed"
        ).length,
      };
    });

    // Apply filters to create filtered grouped statuses
    const filteredGrouped: Record<
      ValidSources,
      ConnectorIndexingStatus<any, any>[]
    > = {} as Record<ValidSources, ConnectorIndexingStatus<any, any>[]>;

    sorted.forEach((source) => {
      const statuses = grouped[source];

      // Apply filters
      const filteredStatuses = statuses.filter((status) => {
        // Filter by access type
        if (filterOptions.accessType && filterOptions.accessType.length > 0) {
          if (!filterOptions.accessType.includes(status.access_type)) {
            return false;
          }
        }

        // Filter by last status
        if (filterOptions.lastStatus && filterOptions.lastStatus.length > 0) {
          if (
            !filterOptions.lastStatus.includes(
              status.last_finished_status as any
            )
          ) {
            return false;
          }
        }

        // Filter by docs count
        if (filterOptions.docsCountFilter.operator) {
          const { operator, value } = filterOptions.docsCountFilter;

          // If only operator is selected (no value), show all
          if (value === null) {
            return true;
          }

          if (operator === ">" && !(status.docs_indexed > value)) {
            return false;
          } else if (operator === "<" && !(status.docs_indexed < value)) {
            return false;
          } else if (operator === "=" && status.docs_indexed !== value) {
            return false;
          }
        }

        return true;
      });

      if (filteredStatuses.length > 0) {
        filteredGrouped[source] = filteredStatuses;
      }
    });

    return {
      groupedStatuses: grouped,
      sortedSources: sorted,
      groupSummaries: summaries,
      filteredGroupedStatuses: filteredGrouped,
    };
  }, [ccPairsIndexingStatuses, editableCcPairsIndexingStatuses, filterOptions]);

  // Determine which sources to display based on filters and search
  const displaySources = useMemo(() => {
    const hasActiveFilters =
      (filterOptions.accessType && filterOptions.accessType.length > 0) ||
      (filterOptions.lastStatus && filterOptions.lastStatus.length > 0) ||
      filterOptions.docsCountFilter.operator !== null;

    if (hasActiveFilters) {
      return Object.keys(filteredGroupedStatuses) as ValidSources[];
    }

    return sortedSources;
  }, [sortedSources, filteredGroupedStatuses, filterOptions]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilterOptions(newFilters);

    // Auto-expand sources when filters are applied
    if (
      (newFilters.accessType && newFilters.accessType.length > 0) ||
      (newFilters.lastStatus && newFilters.lastStatus.length > 0) ||
      newFilters.docsCountFilter.operator !== null
    ) {
      // We need to wait for the filteredGroupedStatuses to be updated
      // before we can expand the sources
      setTimeout(() => {
        const sourcesToExpand = Object.keys(
          filteredGroupedStatuses
        ) as ValidSources[];
        const newConnectorsToggled = { ...connectorsToggled };

        sourcesToExpand.forEach((source) => {
          newConnectorsToggled[source] = true;
        });

        setConnectorsToggled(newConnectorsToggled);
        Cookies.set(
          TOGGLED_CONNECTORS_COOKIE_NAME,
          JSON.stringify(newConnectorsToggled)
        );
      }, 0);
    }
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterOptions = {
      accessType: null,
      docsCountFilter: {
        operator: null,
        value: null,
      },
      lastStatus: null,
    };

    setFilterOptions(emptyFilters);

    // Reset the FilterComponent's internal state
    if (filterComponentRef.current) {
      filterComponentRef.current.resetFilters();
    }
  };

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      (filterOptions.accessType && filterOptions.accessType.length > 0) ||
      (filterOptions.lastStatus && filterOptions.lastStatus.length > 0) ||
      filterOptions.docsCountFilter.operator !== null
    );
  }, [filterOptions]);

  const toggleSource = (
    source: ValidSources,
    toggled: boolean | null = null
  ) => {
    const newConnectorsToggled = {
      ...connectorsToggled,
      [source]: toggled == null ? !connectorsToggled[source] : toggled,
    };
    setConnectorsToggled(newConnectorsToggled);
    Cookies.set(
      TOGGLED_CONNECTORS_COOKIE_NAME,
      JSON.stringify(newConnectorsToggled)
    );
  };
  const toggleSources = () => {
    const connectors = sortedSources.reduce((acc, source) => {
      acc[source] = shouldExpand;
      return acc;
    }, {} as Record<ValidSources, boolean>);

    setConnectorsToggled(connectors);
    Cookies.set(TOGGLED_CONNECTORS_COOKIE_NAME, JSON.stringify(connectors));
  };

  const shouldExpand =
    Object.values(connectorsToggled).filter(Boolean).length <
    sortedSources.length;

  return (
    <>
      <Table>
        <TableHeader>
          <ConnectorRow
            invisible
            ccPairsIndexingStatus={{
              cc_pair_id: 1,
              name: i18n.t(k.SAMPLE_FILE_CONNECTOR),
              cc_pair_status: ConnectorCredentialPairStatus.ACTIVE,
              last_status: "success",
              connector: {
                name: i18n.t(k.SAMPLE_FILE_CONNECTOR),
                source: ValidSources.File,
                input_type: "poll",
                connector_specific_config: {
                  file_locations: ["/path/to/sample/file.txt"],
                },
                refresh_freq: 86400,
                prune_freq: null,
                indexing_start: new Date("2023-07-01T12:00:00Z"),
                id: 1,
                credential_ids: [],
                access_type: "public",
                time_created: "2023-07-01T12:00:00Z",
                time_updated: "2023-07-01T12:00:00Z",
              },
              credential: {
                id: 1,
                name: i18n.t(k.SAMPLE_CREDENTIAL),
                source: ValidSources.File,
                user_id: "1",
                time_created: "2023-07-01T12:00:00Z",
                time_updated: "2023-07-01T12:00:00Z",
                credential_json: {},
                admin_public: false,
              },
              access_type: "public",
              docs_indexed: 1000,
              last_success: "2023-07-01T12:00:00Z",
              last_finished_status: "success",
              latest_index_attempt: null,
              groups: [], // Add this line
            }}
            isEditable={false}
          />
        </TableHeader>
        <div className="flex -mt-12 items-center w-0 m4 gap-x-2">
          <input
            type="text"
            ref={searchInputRef}
            placeholder="Найти коннекторы..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ml-1 w-96 h-9 border border-border flex-none rounded-md bg-background-50 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />

          <Button className="h-9" onClick={() => toggleSources()}>
            {!shouldExpand ? i18n.t(k.COLLAPSE_ALL) : i18n.t(k.EXPAND_ALL)}
          </Button>

          <div className="flex items-center gap-2">
            <FilterComponent
              onFilterChange={handleFilterChange}
              ref={filterComponentRef}
            />

            {hasActiveFilters && (
              <div className="flex flex-none items-center gap-1 ml-2 max-w-[500px]">
                {filterOptions.accessType &&
                  filterOptions.accessType.length > 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {i18n.t(k.ACCESS1)} {filterOptions.accessType.join(", ")}
                    </Badge>
                  )}

                {filterOptions.lastStatus &&
                  filterOptions.lastStatus.length > 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {i18n.t(k.STATUS2)}{" "}
                      {filterOptions.lastStatus
                        .map((s) => s.replace(/_/g, " "))
                        .join(", ")}
                    </Badge>
                  )}

                {filterOptions.docsCountFilter.operator &&
                  filterOptions.docsCountFilter.value !== null && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {i18n.t(k.DOCS1)} {filterOptions.docsCountFilter.operator}{" "}
                      {filterOptions.docsCountFilter.value}
                    </Badge>
                  )}

                {filterOptions.docsCountFilter.operator &&
                  filterOptions.docsCountFilter.value === null && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {i18n.t(k.DOCS1)} {filterOptions.docsCountFilter.operator}{" "}
                      {i18n.t(k.ANY)}
                    </Badge>
                  )}

                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-xs border-red-400  bg-red-100 hover:border-red-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => {
                    if (filterComponentRef.current) {
                      filterComponentRef.current.resetFilters();
                      setFilterOptions({
                        accessType: null,
                        docsCountFilter: {
                          operator: null,
                          value: null,
                        },
                        lastStatus: null,
                      });
                    }
                  }}
                >
                  <span className="text-red-500 dark:text-red-400">
                    {i18n.t(k.CLEAR)}
                  </span>
                </Badge>
              </div>
            )}
          </div>
        </div>
        <TableBody>
          {displaySources.map((source, ind) => {
            const sourceMatches = source
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

            const statuses =
              filteredGroupedStatuses[source] || groupedStatuses[source];

            const matchingConnectors = statuses.filter((status) =>
              (status.name || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            );

            if (sourceMatches || matchingConnectors.length > 0) {
              return (
                <React.Fragment key={ind}>
                  <br className="mt-4" />
                  <SummaryRow
                    source={source}
                    summary={groupSummaries[source]}
                    isOpen={connectorsToggled[source] || false}
                    onToggle={() => toggleSource(source)}
                  />

                  {connectorsToggled[source] && (
                    <>
                      <TableRow className="border border-border dark:border-neutral-700">
                        <TableHead>{i18n.t(k.NAME)}</TableHead>
                        <TableHead>{i18n.t(k.LAST_INDEXED)}</TableHead>
                        <TableHead>{i18n.t(k.ACTIVITY)}</TableHead>
                        {isPaidEnterpriseFeaturesEnabled && (
                          <TableHead>{i18n.t(k.PERMISSIONS)}</TableHead>
                        )}
                        <TableHead>{i18n.t(k.TOTAL_DOCS)}</TableHead>
                        <TableHead>{i18n.t(k.LAST_STATUS)}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                      {(sourceMatches ? statuses : matchingConnectors).map(
                        (ccPairsIndexingStatus) => (
                          <ConnectorRow
                            key={ccPairsIndexingStatus.cc_pair_id}
                            ccPairsIndexingStatus={ccPairsIndexingStatus}
                            isEditable={editableCcPairsIndexingStatuses.some(
                              (e) =>
                                e.cc_pair_id ===
                                ccPairsIndexingStatus.cc_pair_id
                            )}
                          />
                        )
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            }
            return null;
          })}
        </TableBody>
      </Table>
    </>
  );
}

import i18n from "@/i18n/init";
import k from "./../../../i18n/keys";
import { useState } from "react";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import CenteredPageSelector from "./CenteredPageSelector";
import { ThreeDotsLoader } from "@/components/Loading";
import { InvitedUserSnapshot } from "@/lib/types";
import { TableHeader } from "@/components/ui/table";
import { InviteUserButton } from "./buttons/InviteUserButton";
import { ErrorCallout } from "@/components/ErrorCallout";
import { FetchError } from "@/lib/fetcher";

const USERS_PER_PAGE = 10;

interface Props {
  users: InvitedUserSnapshot[];
  setPopup: (spec: PopupSpec) => void;
  mutate: () => void;
  error: FetchError | null;
  isLoading: boolean;
  q: string;
}

const InvitedUserTable = ({
  users,
  setPopup,
  mutate,
  error,
  isLoading,
  q,
}: Props) => {
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);

  if (!users.length) return <p>{i18n.t(k.USERS_THAT_HAVE_BEEN_INVITED_W)}</p>;

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  // Filter users based on the search query
  const filteredUsers = q
    ? users.filter((user) => user.email.includes(q))
    : users;

  // Get the current page of users
  const currentPageOfUsers = filteredUsers.slice(
    (currentPageNum - 1) * USERS_PER_PAGE,
    currentPageNum * USERS_PER_PAGE
  );

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error) {
    return (
      <ErrorCallout
        errorTitle="Error loading users"
        errorMsg={error?.info?.detail}
      />
    );
  }

  return (
    <>
      <Table className="overflow-visible">
        <TableHeader>
          <TableRow>
            <TableHead>{i18n.t(k.EMAIL)}</TableHead>
            <TableHead>
              <div className="flex justify-end">{i18n.t(k.ACTIONS)}</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentPageOfUsers.length ? (
            currentPageOfUsers.map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <InviteUserButton
                      user={user}
                      invited={true}
                      setPopup={setPopup}
                      mutate={mutate}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">
                {`${i18n.t(k.NO_USERS_FOUND_MATCHING)}${q}${i18n.t(k._17)}`}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <CenteredPageSelector
          currentPage={currentPageNum}
          totalPages={totalPages}
          onPageChange={setCurrentPageNum}
        />
      ) : null}
    </>
  );
};

export default InvitedUserTable;

"use client";
import i18n from "@/i18n/init";
import k from "./../../../../i18n/keys";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClipboardIcon, EditIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useStandardAnswers, useStandardAnswerCategories } from "./hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import Link from "next/link";
import { StandardAnswer, StandardAnswerCategory } from "@/lib/types";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deleteStandardAnswer } from "./lib";
import { FilterDropdown } from "@/components/search/filtering/FilterDropdown";
import { FiTag } from "react-icons/fi";
import { PageSelector } from "@/components/PageSelector";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import Text from "@/components/ui/text";
import { TableHeader } from "@/components/ui/table";
import CreateButton from "@/components/ui/createButton";

const NUM_RESULTS_PER_PAGE = 10;

type Displayable = JSX.Element | string;

const RowTemplate = ({
  id,
  entries,
}: {
  id: number;
  entries: [
    Displayable,
    Displayable,
    Displayable,
    Displayable,
    Displayable,
    Displayable
  ];
}) => {
  return (
    <TableRow key={id}>
      <TableCell className="w-1/24">{entries[0]}</TableCell>
      <TableCell className="w-2/12">{entries[1]}</TableCell>
      <TableCell className="w-2/12">{entries[2]}</TableCell>
      <TableCell className="w-1/24">{entries[3]}</TableCell>
      <TableCell className="w-7/12 overflow-auto">{entries[4]}</TableCell>
      <TableCell className="w-1/24">{entries[5]}</TableCell>
    </TableRow>
  );
};

const CategoryBubble = ({
  name,
  onDelete,
}: {
  name: string;
  onDelete?: () => void;
}) => (
  <span
    className={`
      inline-block
      px-2
      py-1
      mr-1
      mb-1
      text-xs
      font-semibold
      text-emphasis
      bg-accent-background-hovered
      rounded-full
      items-center
      w-fit
      ${onDelete ? "cursor-pointer" : ""}
    `}
    onClick={onDelete}
  >
    {name}
    {onDelete && (
      <button
        className="ml-1 text-subtle hover:text-emphasis"
        aria-label="Remove category"
      >
        {i18n.t(k._36)}
      </button>
    )}
  </span>
);

const StandardAnswersTableRow = ({
  standardAnswer,
  handleDelete,
}: {
  standardAnswer: StandardAnswer;
  handleDelete: (id: number) => void;
}) => {
  return (
    <RowTemplate
      id={standardAnswer.id}
      entries={[
        <Link
          key={`edit-${standardAnswer.id}`}
          href={`/admin/standard-answer/${standardAnswer.id}`}
        >
          <EditIcon />
        </Link>,
        <div key={`categories-${standardAnswer.id}`}>
          {standardAnswer.categories.map((category) => (
            <CategoryBubble key={category.id} name={category.name} />
          ))}
        </div>,
        <ReactMarkdown key={`keyword-${standardAnswer.id}`}>
          {standardAnswer.match_regex
            ? `\`${standardAnswer.keyword}\``
            : standardAnswer.keyword}
        </ReactMarkdown>,
        <CustomCheckbox
          key={`match_regex-${standardAnswer.id}`}
          checked={standardAnswer.match_regex}
        />,
        <ReactMarkdown
          key={`answer-${standardAnswer.id}`}
          className="prose dark:prose-invert"
          remarkPlugins={[remarkGfm]}
        >
          {standardAnswer.answer}
        </ReactMarkdown>,
        <div
          key={`delete-${standardAnswer.id}`}
          className="cursor-pointer"
          onClick={() => handleDelete(standardAnswer.id)}
        >
          <TrashIcon />
        </div>,
      ]}
    />
  );
};

const StandardAnswersTable = ({
  standardAnswers,
  standardAnswerCategories,
  refresh,
  setPopup,
}: {
  standardAnswers: StandardAnswer[];
  standardAnswerCategories: StandardAnswerCategory[];
  refresh: () => void;
  setPopup: (popup: PopupSpec | null) => void;
}) => {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<
    StandardAnswerCategory[]
  >([]);
  const columns = [
    { name: i18n.t(k._1), key: i18n.t(k.EDIT2) },
    { name: i18n.t(k.CATEGORIES1), key: i18n.t(k.CATEGORY1) },
    { name: i18n.t(k.KEYWORDS_PATTERN), key: i18n.t(k.KEYWORD) },
    { name: i18n.t(k.MATCH_REGEX1), key: i18n.t(k.MATCH_REGEX2) },
    { name: i18n.t(k.ANSWER), key: i18n.t(k.ANSWER2) },
    { name: i18n.t(k._1), key: i18n.t(k.DELETE1) },
  ];

  const filteredStandardAnswers = standardAnswers.filter((standardAnswer) => {
    const {
      answer,
      id,
      categories,
      match_regex,
      match_any_keywords,
      ...fieldsToSearch
    } = standardAnswer;
    const cleanedQuery = query.toLowerCase();
    const searchMatch = Object.values(fieldsToSearch).some((value) => {
      return value.toLowerCase().includes(cleanedQuery);
    });
    const categoryMatch =
      selectedCategories.length == 0 ||
      selectedCategories.some((category) =>
        categories.map((c) => c.id).includes(category.id)
      );
    return searchMatch && categoryMatch;
  });

  const totalPages = Math.ceil(
    filteredStandardAnswers.length / NUM_RESULTS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * NUM_RESULTS_PER_PAGE;
  const endIndex = startIndex + NUM_RESULTS_PER_PAGE;
  const paginatedStandardAnswers = filteredStandardAnswers.slice(
    startIndex,
    endIndex
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: number) => {
    const response = await deleteStandardAnswer(id);
    if (response.ok) {
      setPopup({
        message: `Стандартный ответ ${id} удален`,
        type: "success",
      });
    } else {
      const errorMsg = await response.text();
      setPopup({
        message: `Не удалось удалить стандартный ответ - ${errorMsg}`,
        type: "error",
      });
    }
    refresh();
  };

  const handleCategorySelect = (category: StandardAnswerCategory) => {
    setSelectedCategories((prev: StandardAnswerCategory[]) => {
      const prevCategoryIds = prev.map((category) => category.id);
      if (prevCategoryIds.includes(category.id)) {
        return prev.filter((c) => c.id !== category.id);
      }
      return [...prev, category];
    });
  };

  return (
    <div className="justify-center py-2">
      <div className="flex items-center w-full border-2 border-border rounded-lg px-4 py-2 focus-within:border-accent">
        <MagnifyingGlass />
        <textarea
          autoFocus
          className="flex-grow ml-2 h-6 bg-transparent outline-none placeholder-subtle overflow-hidden whitespace-normal resize-none"
          role="textarea"
          aria-multiline
          placeholder="Найти стандартные ответы по ключевому слову/фразе..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCurrentPage(1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          suppressContentEditableWarning={true}
        />
      </div>
      <div className="my-4 border-b border-border">
        <FilterDropdown
          options={standardAnswerCategories.map((category) => {
            return {
              key: category.name,
              display: category.name,
            };
          })}
          selected={selectedCategories.map((category) => category.name)}
          handleSelect={(option) => {
            handleCategorySelect(
              standardAnswerCategories.find(
                (category) => category.name === option.key
              )!
            );
          }}
          icon={
            <div className="my-auto mr-2 w-[16px] h-[16px]">
              <FiTag size={16} />
            </div>
          }
          defaultDisplay="Все категории"
        />

        <div className="flex flex-wrap pb-4 mt-3">
          {selectedCategories.map((category) => (
            <CategoryBubble
              key={category.id}
              name={category.name}
              onDelete={() => handleCategorySelect(category)}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto">
        <Table className="w-full flex items-stretch">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedStandardAnswers.length > 0 ? (
              paginatedStandardAnswers.map((item) => (
                <StandardAnswersTableRow
                  key={item.id}
                  standardAnswer={item}
                  handleDelete={handleDelete}
                />
              ))
            ) : (
              <RowTemplate id={0} entries={["", "", "", "", "", ""]} />
            )}
          </TableBody>
        </Table>
        {paginatedStandardAnswers.length === 0 && (
          <div className="flex justify-center">
            <Text>{i18n.t(k.NO_MATCHING_STANDARD_ANSWERS_F)}</Text>
          </div>
        )}
        {paginatedStandardAnswers.length > 0 && (
          <>
            {/* <div className="mt-4">
              <Text>
                {i18n.t(k.ENSURE_THAT_YOU_HAVE_ADDED_THE)}{" "}
                <a className="text-link" href="/admin/bots">
                  {i18n.t(k.SLACK_BOT)}
                </a>
                {i18n.t(k._8)}
              </Text>
            </div> */}
            <div className="mt-4 flex justify-center">
              <PageSelector
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                shouldScroll={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Main = () => {
  const { popup, setPopup } = usePopup();
  const {
    data: standardAnswers,
    error: standardAnswersError,
    isLoading: standardAnswersIsLoading,
    refreshStandardAnswers,
  } = useStandardAnswers();
  const {
    data: standardAnswerCategories,
    error: standardAnswerCategoriesError,
    isLoading: standardAnswerCategoriesIsLoading,
  } = useStandardAnswerCategories();

  if (standardAnswersIsLoading || standardAnswerCategoriesIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (standardAnswersError || !standardAnswers) {
    return (
      <ErrorCallout
        errorTitle="Ошибка загрузки стандартных ответов"
        errorMsg={
          standardAnswersError.info?.message ||
          standardAnswersError.message.info?.detail
        }
      />
    );
  }

  if (standardAnswerCategoriesError || !standardAnswerCategories) {
    return (
      <ErrorCallout
        errorTitle="Ошибка загрузки стандартных категорий ответов"
        errorMsg={
          standardAnswerCategoriesError.info?.message ||
          standardAnswerCategoriesError.message.info?.detail
        }
      />
    );
  }

  return (
    <div className="mb-8">
      {popup}

      <Text className="mb-2">
        {i18n.t(k.MANAGE_THE_STANDARD_ANSWERS_FO)}
        <br />
        {i18n.t(k.NOTE_CURRENTLY_ONLY_QUESTION)}
      </Text>
      {standardAnswers.length == 0 && (
        <Text className="mb-2">{i18n.t(k.ADD_YOUR_FIRST_STANDARD_ANSWER)}</Text>
      )}
      <div className="mb-2"></div>

      <CreateButton
        href="/admin/standard-answer/new"
        text="Новый стандартный ответ"
      />

      <Separator />

      <div>
        <StandardAnswersTable
          standardAnswers={standardAnswers}
          standardAnswerCategories={standardAnswerCategories}
          refresh={refreshStandardAnswers}
          setPopup={setPopup}
        />
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ClipboardIcon size={32} />}
        title="Стандартные ответы"
      />

      <Main />
    </div>
  );
};

export default Page;

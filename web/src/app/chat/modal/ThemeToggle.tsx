"use client";
import i18n from "i18next";
import k from "./../../../i18n/keys";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{i18n.t(k.TOGGLE_THEME)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={
            theme === "light" ? "bg-neutral-100 dark:bg-neutral-800" : ""
          }
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>{i18n.t(k.LIGHT)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={
            theme === "dark" ? "bg-neutral-100 dark:bg-neutral-800" : ""
          }
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>{i18n.t(k.DARK)}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={
            theme === "system" ? "bg-neutral-100 dark:bg-neutral-800" : ""
          }
        >
          <Laptop className="mr-2 h-4 w-4" />
          <span>{i18n.t(k.SYSTEM)}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

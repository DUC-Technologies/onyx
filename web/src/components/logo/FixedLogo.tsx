"use client";
import i18n from "@/i18n/init";
import k from "./../../i18n/keys";

import React, { memo } from "react";
import { HeaderTitle } from "@/components/header/HeaderTitle";
import { Logo } from "@/components/logo/Logo";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED } from "@/lib/constants";
import Link from "next/link";
import { useContext } from "react";
import { FiSidebar } from "react-icons/fi";
import { LogoType } from "@/components/logo/Logo";
import { EnterpriseSettings } from "@/app/admin/settings/interfaces";
import { useRouter } from "next/navigation";

export const LogoComponent = memo(function LogoComponent({
  enterpriseSettings,
  backgroundToggled,
  show,
  isAdmin,
}: {
  enterpriseSettings: EnterpriseSettings | null;
  backgroundToggled?: boolean;
  show?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <div
      onClick={isAdmin ? () => router.push(i18n.t(k.CHAT)) : () => {}}
      className={`max-w-[200px]
        ${!show && "mobile:hidden"}
       flex text-text-900 items-center gap-x-1`}
    >
      {enterpriseSettings && enterpriseSettings.application_name ? (
        <>
          <div className="flex-none my-auto">
            <Logo height={24} width={24} />
          </div>
          <div className="w-full">
            <HeaderTitle backgroundToggled={backgroundToggled}>
              {enterpriseSettings.application_name}
            </HeaderTitle>
          </div>
        </>
      ) : (
        <LogoType />
      )}
    </div>
  );
});

export default function FixedLogo({
  backgroundToggled,
}: {
  backgroundToggled?: boolean;
}) {
  const combinedSettings = useContext(SettingsContext);
  const enterpriseSettings = combinedSettings?.enterpriseSettings;

  return (
    <>
      <Link
        href="/chat"
        className="fixed cursor-pointer flex z-40 left-4 top-3 h-8"
      >
        <LogoComponent
          enterpriseSettings={enterpriseSettings!}
          backgroundToggled={backgroundToggled}
        />
      </Link>
      <div className="mobile:hidden fixed left-4 bottom-4">
        <FiSidebar
          className={`${
            backgroundToggled
              ? "text-text-mobile-sidebar-toggled"
              : "text-text-mobile-sidebar-untoggled"
          }`}
        />
      </div>
    </>
  );
}

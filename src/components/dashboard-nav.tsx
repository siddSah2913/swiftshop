"use client";

// Dashboard navigation. One item set, two form factors:
//  - `bottom`: a fixed, thumb-friendly tab bar (phones)
//  - `side`: a left sidebar rail (desktops) — brand + links + tools
// Active state is derived from the current pathname (client-side via
// usePathname: layouts never re-render on navigation, so a server layout
// cannot know the active tab).

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export type DashboardNavItem = {
  href: string;
  label: string;
};

type BottomProps = { items: DashboardNavItem[]; variant: "bottom" };

type SideProps = {
  items: DashboardNavItem[];
  variant: "side";
  brandLabel: string;
  signOutLabel: string;
  locale: Locale;
};

type Props = BottomProps | SideProps;

export function DashboardNav(props: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const itemLink = (active: boolean) =>
    active
      ? "text-teal-700"
      : "text-zinc-600 hover:text-zinc-900";

  if (props.variant === "bottom") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white md:hidden">
        <ul className="grid grid-cols-4">
          {props.items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block py-2.5 text-center text-sm font-medium ${itemLink(active)}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="border-b border-zinc-100 px-4 py-4 font-bold text-teal-700 hover:text-teal-900"
      >
        {props.brandLabel}
      </Link>
      <ul className="flex flex-col">
        {props.items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block border-l-2 px-4 py-2.5 text-sm font-medium ${
                  active
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 px-4 py-3">
        <LanguageSwitcher locale={props.locale} />
        <SignOutButton label={props.signOutLabel} />
      </div>
    </nav>
  );
}
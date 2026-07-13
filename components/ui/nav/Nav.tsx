"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Home,
  MousePointerClick,
  LogOut,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

// This dashboard has no auth; use a static identity for the profile block.
const USER = { name: "Boxii Analytics", email: "analytics@boxii.co" };

const MOBILE_BREAKPOINT = 480;
const TABLET_BREAKPOINT = 768;

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", href: "/", icon: Home },
  {
    id: "heatmap",
    label: "Heatmap",
    href: "/heatmap",
    icon: MousePointerClick,
  },
];

const BARE_ROUTES: string[] = [];

function Wordmark() {
  return (
    <span className="text-xl font-bold tracking-tight text-brand-dark lowercase">
      boxii
    </span>
  );
}

export function Nav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const onToggle = () => setOpen((o) => !o);
  const logout = () => {};

  const isBare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  const displayName = USER.name;
  const displayEmail = USER.email;
  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isItemActive = (item: NavItem) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  useEffect(() => {
    const mobileMql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );
    const tabletMql = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`,
    );

    const apply = () => {
      setIsMobile(mobileMql.matches);
      setIsTablet(tabletMql.matches);
      setOpen(false);
    };

    apply();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
    setMounted(true);
    const onChange = () => apply();
    mobileMql.addEventListener("change", onChange);
    tabletMql.addEventListener("change", onChange);
    return () => {
      mobileMql.removeEventListener("change", onChange);
      tabletMql.removeEventListener("change", onChange);
    };
  }, []);

  const collapsedContent = (
    <>
      <div className="h-8 w-8 rounded-full bg-status-neutral-bg text-muted-foreground flex items-center justify-center text-xs font-semibold">
        {initials}
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label="Log out"
        onClick={logout}
      >
        <LogOut size={18} />
      </button>
      <div className="flex flex-col items-center gap-4 border-t border-b border-border py-4 w-full">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
      </div>
      <nav className="flex flex-col items-center gap-4 flex-1">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-surface text-brand-dark" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={item.label}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.75 : 2} />
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-pointer mt-auto"
        aria-label="Open sidebar"
        onClick={onToggle}
      >
        <PanelLeftOpen size={20} />
      </button>
    </>
  );

  const expandedContent = (
    <div className="flex flex-col h-full w-[160px] gap-7">
      <div className="flex flex-col gap-5 items-start w-full">
        <div className="flex flex-col gap-2 items-center w-full">
          <div className="h-8 w-8 rounded-full bg-status-neutral-bg text-muted-foreground flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
          <div className="flex flex-col items-center w-full text-center">
            <span className="text-base leading-7 text-foreground whitespace-nowrap">
              {displayName}
            </span>
            <span className="text-xs leading-6 text-muted-foreground whitespace-nowrap">
              {displayEmail}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 justify-center w-full bg-surface border border-border rounded-xl px-3 py-1.5 shadow-[0px_1px_0.5px_0px_rgba(37,13,83,0.02)] hover:bg-muted cursor-pointer"
          onClick={logout}
        >
          <LogOut size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Log out
          </span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-b border-border py-4 w-full">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if ((isMobile || isTablet) && open) onToggle();
              }}
              className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-base transition-colors whitespace-nowrap ${isActive ? "bg-surface font-bold text-brand-dark" : "text-muted-foreground"}`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between w-full mt-auto">
        <Wordmark />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Close sidebar"
          onClick={onToggle}
        >
          <PanelLeftClose size={20} />
        </button>
      </div>
    </div>
  );

  const isDesktop = !isMobile && !isTablet;

  if (isBare) return <>{children}</>;
  if (!mounted) return null;

  return (
    <div className="h-screen w-full overflow-hidden flex relative">
      {/* Backdrop — visible on tablet/mobile when expanded */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${(isTablet || isMobile) && open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onToggle}
        aria-hidden="true"
      />

      {/* Mobile: horizontal top bar */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-white shadow-[0px_2px_4px_0px_rgba(59,37,89,0.1),0px_4px_6px_0px_rgba(59,37,89,0.1)]">
          <div className="flex items-center justify-between px-4 py-4">
            <Wordmark />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={onToggle}
            >
              {open ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>

          {/* Mobile: dropdown menu */}
          <div
            className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${open ? "max-h-[600px]" : "max-h-0"}`}
          >
            <nav className="flex flex-col gap-3 px-6 py-4">
              {navItems.map((item) => {
                const isActive = isItemActive(item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      if (open) onToggle();
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-4 text-base transition-colors ${isActive ? "bg-surface font-bold text-brand-dark" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <item.icon size={24} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center justify-between border-t border-border px-6 py-5">
              <span className="text-base text-foreground">{displayName}</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Settings"
                >
                  <Settings size={24} />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell size={24} />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Log out"
                  onClick={logout}
                >
                  <LogOut size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablet: collapsed icon strip — always in flow */}
      <div
        className={`shrink-0 h-full bg-white flex flex-col items-center py-5 px-2 gap-6 relative z-30 shadow-[2px_0_4px_2px_rgba(59,37,89,0.05),4px_0_6px_2px_rgba(59,37,89,0.05)] ${isTablet ? "" : "hidden"}`}
      >
        {collapsedContent}
      </div>

      {/* Tablet: expanded sidebar — fixed overlay */}
      <div
        className={`shrink-0 h-full bg-white flex p-5 shadow-[2px_0_4px_2px_rgba(59,37,89,0.05),4px_0_6px_2px_rgba(59,37,89,0.05)] w-[200px] transition-transform duration-300 ease-in-out fixed left-0 top-0 z-50 ${!isTablet ? "hidden" : !open ? "-translate-x-full" : "translate-x-0"}`}
      >
        {expandedContent}
      </div>

      {/* Desktop: single container, width transitions between collapsed and expanded */}
      <div
        className={`shrink-0 h-full relative z-30 overflow-hidden transition-[width] duration-300 ease-in-out shadow-[2px_0_4px_2px_rgba(59,37,89,0.05),4px_0_6px_2px_rgba(59,37,89,0.05)] ${isDesktop ? (open ? "w-[200px]" : "w-12") : "hidden"}`}
      >
        {/* Collapsed view */}
        <div
          className={`absolute inset-0 bg-white flex flex-col items-center py-5 px-2 gap-6 transition-opacity duration-200 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          {collapsedContent}
        </div>

        {/* Expanded view */}
        <div
          className={`w-[200px] h-full bg-white flex p-5 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {expandedContent}
        </div>
      </div>

      <div
        className={`flex-1 min-w-0 p-0 overflow-y-auto overflow-x-hidden @container flex flex-col gap-6 bg-surface ${isMobile ? "pt-16" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

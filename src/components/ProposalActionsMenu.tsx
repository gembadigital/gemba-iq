import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

type Action = { label: string; icon: React.ReactNode; run: () => void; danger?: boolean };
export default function ProposalActionsMenu({ actions, proposalNumber }: { actions: Action[]; proposalNumber: string }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => { setPosition(null); trigger.current?.focus(); };
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null);
    };
    const hide = () => setPosition(null);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [position]);
  return <>
    <button ref={trigger} type="button" aria-label={`${proposalNumber} işlemleri`} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position ? id : undefined}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      onClick={() => {
        if (position) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        const height = actions.length * 38 + 12;
        setPosition({ left: Math.max(8, Math.min(rect.right - 250, window.innerWidth - 258)),
          top: rect.bottom + height < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - height - 6) });
      }}>İşlemler <MoreHorizontal size={16} /></button>
    {position && createPortal(<div ref={menu} id={id} role="menu" aria-label="Teklif işlemleri"
      className="fixed z-[200] w-[250px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      style={{ ...position, maxHeight: "calc(100vh - 16px)" }}
      onKeyDown={event => {
        if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); close(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>("button"));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
      }}>
      {actions.map(action => <button type="button" role="menuitem" key={action.label}
        className={`flex min-h-[38px] w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs focus:outline-none focus:bg-slate-100 dark:focus:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 ${action.danger ? "text-red-600" : "text-slate-700 dark:text-zinc-200"}`}
        onClick={() => { close(); action.run(); }}>{action.icon}{action.label}</button>)}
    </div>, document.body)}
  </>;
}

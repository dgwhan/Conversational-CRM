import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button.js";

export interface ActionOverflowMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "warning" | "danger" | "success";
  disabled?: boolean;
  dividerBefore?: boolean;
}

export interface ActionOverflowMenuProps {
  ariaLabel: string;
  items: ActionOverflowMenuItem[];
  className?: string;
}

const itemToneClasses = {
  default: "text-slate-700 hover:bg-slate-50",
  warning: "text-amber-700 hover:bg-amber-50",
  danger: "text-red-700 hover:bg-red-50",
  success: "text-emerald-700 hover:bg-emerald-50",
};

export const ActionOverflowMenu: React.FC<ActionOverflowMenuProps> = ({
  ariaLabel,
  items,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setIsOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (containerRef.current?.contains(target) ||
          menuRef.current?.contains(target))
      ) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [isOpen]);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight =
      items.reduce(
        (height, item) => height + 34 + (item.dividerBefore ? 9 : 0),
        8,
      );
    const edge = 8;
    const left = Math.max(
      edge,
      Math.min(
        triggerRect.right - menuWidth,
        window.innerWidth - menuWidth - edge,
      ),
    );
    const top =
      triggerRect.bottom + menuHeight + edge <= window.innerHeight
        ? triggerRect.bottom + 4
        : Math.max(edge, triggerRect.top - menuHeight - 4);

    setPosition({ top, left });
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={className}>
      <Button
        variant="ghost"
        size="sm"
        icon={<MoreHorizontal size={16} />}
        className="!h-10 !w-10 !gap-0 !px-0 !py-0 text-slate-500 hover:text-slate-800"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) =>
          isOpen ? setIsOpen(false) : openMenu(event)
        }
      >
        <span className="sr-only">{ariaLabel}</span>
      </Button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[100] w-52 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-lg"
          >
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.dividerBefore && (
                  <div
                    role="separator"
                    className="my-1 border-t border-slate-100"
                  />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    item.onSelect();
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium disabled:cursor-not-allowed disabled:text-slate-400 ${
                    itemToneClasses[item.tone ?? "default"]
                  }`}
                >
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

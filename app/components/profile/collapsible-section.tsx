"use client"

import { useState, useEffect, ReactNode } from "react"
import { ChevronUp, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  icon: LucideIcon
  children: ReactNode
  defaultOpen?: boolean
  storageKey: string
  action?: ReactNode
}

export function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  storageKey,
  action
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setIsOpen(saved !== null ? saved === "true" : defaultOpen)
    setIsReady(true)
  }, [defaultOpen, storageKey])

  const toggleOpen = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem(storageKey, String(newState))
  }

  return (
    <div className="profile-section-surface surface-panel-strong overflow-hidden rounded-[1.75rem]">
      <div className="profile-section-toolbar surface-toolbar-workspace px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleOpen}
            className="group flex min-w-0 flex-1 items-center gap-4 text-left"
          >
            <Icon className="h-5 w-5 flex-shrink-0 text-primary transition-transform duration-300 group-hover:scale-105" />
            <h2 className="flex-1 text-left text-lg font-semibold">{title}</h2>
            <ChevronUp
              className={cn(
                "h-5 w-5 flex-shrink-0 text-primary transition-transform",
                !isOpen && "rotate-180"
              )}
            />
          </button>
          {action && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
        </div>
      </div>

      {isReady && isOpen && (
        <div className="profile-section-content px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      )}
    </div>
  )
}

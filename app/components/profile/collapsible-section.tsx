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
  const [isOpen, setIsOpen] = useState(defaultOpen)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) {
      setIsOpen(saved === "true")
    }
  }, [storageKey])

  const toggleOpen = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem(storageKey, String(newState))
  }

  return (
    <div className="bg-background rounded-lg border-2 border-primary/20 overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 border-b border-transparent">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          <h2 className="text-lg font-semibold flex-1 text-left">{title}</h2>
          <ChevronUp 
            className={cn(
              "w-5 h-5 text-primary transition-transform flex-shrink-0",
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
      
      {isOpen && (
        <div className="px-6 pb-5 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

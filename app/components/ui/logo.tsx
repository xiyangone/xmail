"use client"

import Link from "next/link"
import Image from "next/image"

export function Logo() {
  return (
    <Link 
      href="/"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <Image 
        src="/cat.svg"
        alt="XiYang Mail Logo"
        width={32}
        height={32}
        className="w-8 h-8"
      />
      <span className="font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#FF8A3D] via-[#FF5E62] to-[#a855f7]">
        XiYang
      </span>
    </Link>
  )
}

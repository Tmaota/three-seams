'use client'

import Image from 'next/image'
import { Navbar } from 'nextra-theme-docs'
import RandomEntry from './RandomEntry'

export default function SanfengNavbar() {
  return (
    <Navbar
      logo={
        <span className="sf-brand">
          <Image
            src="/icons/icon-brand.svg"
            alt=""
            width={22}
            height={22}
            className="sf-brand-icon"
          />
          三缝之地百科
        </span>
      }
    >
      <RandomEntry />
    </Navbar>
  )
}

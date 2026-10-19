'use client'

import { Navbar } from 'nextra-theme-docs'
import RandomEntry from './RandomEntry'
import { asset } from '@/lib/asset'

export default function SanfengNavbar() {
  return (
    <Navbar
      logo={
        <span className="sf-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset('/icons/icon-brand.svg')}
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

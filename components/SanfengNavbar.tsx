'use client'

import { Navbar, ThemeSwitch } from 'nextra-theme-docs'
import RandomEntry from './RandomEntry'

export default function SanfengNavbar() {
  return (
    <Navbar
      logo={
        <span className="sf-brand">
          <span className="sf-brand-diamond" aria-hidden>
            ◆
          </span>
          三缝之地百科
        </span>
      }
    >
      <RandomEntry />
      <ThemeSwitch />
    </Navbar>
  )
}

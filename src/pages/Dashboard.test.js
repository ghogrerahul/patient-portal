import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders key dashboard content', () => {
    const html = renderToStaticMarkup(React.createElement(Dashboard))

    expect(html).toContain('Hospital Management System')
    expect(html).toContain('Total Patients')
    expect(html).toContain('Patients content here')
  })
})

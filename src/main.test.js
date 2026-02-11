import { beforeEach, describe, expect, it, vi } from 'vitest'

const renderMock = vi.fn()
const createRootMock = vi.fn(() => ({ render: renderMock }))

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: createRootMock
  }
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    renderMock.mockReset()
    createRootMock.mockReset()
    createRootMock.mockReturnValue({ render: renderMock })
    vi.resetModules()
  })

  it('creates root and renders app', async () => {
    await import('./main.jsx')

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'))
    expect(renderMock).toHaveBeenCalledTimes(1)
  })
})

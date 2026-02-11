import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient)
  }
}))

describe('api service', () => {
  let requestSuccessHandler
  let responseSuccessHandler
  let responseErrorHandler

  beforeEach(() => {
    mockClient.get.mockReset()
    mockClient.post.mockReset()
    mockClient.put.mockReset()
    mockClient.delete.mockReset()
    mockClient.interceptors.request.use.mockReset()
    mockClient.interceptors.response.use.mockReset()
    localStorage.clear()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('calls patient endpoints with expected arguments', async () => {
    const { patientAPI } = await import('./api')

    await patientAPI.getAll({ page: 1 })
    await patientAPI.getById('p-1')
    await patientAPI.create({ name: 'Alice' })
    await patientAPI.update('p-1', { name: 'Alice Updated' })
    await patientAPI.delete('p-1')
    await patientAPI.search({ q: 'alice' })

    expect(mockClient.get).toHaveBeenCalledWith('/patients', { params: { page: 1 } })
    expect(mockClient.get).toHaveBeenCalledWith('/patients/p-1')
    expect(mockClient.post).toHaveBeenCalledWith('/patients', { name: 'Alice' })
    expect(mockClient.put).toHaveBeenCalledWith('/patients/p-1', { name: 'Alice Updated' })
    expect(mockClient.delete).toHaveBeenCalledWith('/patients/p-1')
    expect(mockClient.get).toHaveBeenCalledWith('/patients/search', { params: { q: 'alice' } })
  })

  it('calls appointment endpoints with expected arguments', async () => {
    const { appointmentAPI } = await import('./api')

    await appointmentAPI.getAll({ date: '2026-02-11' })
    await appointmentAPI.getById('a-1')
    await appointmentAPI.create({ patientId: 'p-1' })
    await appointmentAPI.update('a-1', { status: 'confirmed' })
    await appointmentAPI.cancel('a-1', 'rescheduled')
    await appointmentAPI.getByPatient('p-1')

    expect(mockClient.get).toHaveBeenCalledWith('/appointments', { params: { date: '2026-02-11' } })
    expect(mockClient.get).toHaveBeenCalledWith('/appointments/a-1')
    expect(mockClient.post).toHaveBeenCalledWith('/appointments', { patientId: 'p-1' })
    expect(mockClient.put).toHaveBeenCalledWith('/appointments/a-1', { status: 'confirmed' })
    expect(mockClient.post).toHaveBeenCalledWith('/appointments/a-1/cancel', { reason: 'rescheduled' })
    expect(mockClient.get).toHaveBeenCalledWith('/appointments/patient/p-1/all')
  })

  it('adds bearer token using request interceptor when token exists', async () => {
    localStorage.setItem('token', 'abc123')
    await import('./api')

    requestSuccessHandler = mockClient.interceptors.request.use.mock.calls[0][0]
    const result = requestSuccessHandler({ headers: {} })

    expect(result.headers.Authorization).toBe('Bearer abc123')
  })

  it('redirects to login on 401 response', async () => {
    localStorage.setItem('token', 'abc123')
    await import('./api')

    responseSuccessHandler = mockClient.interceptors.response.use.mock.calls[0][0]
    responseErrorHandler = mockClient.interceptors.response.use.mock.calls[0][1]

    expect(responseSuccessHandler({ data: { ok: true } })).toEqual({ ok: true })

    await expect(
      responseErrorHandler({ response: { status: 401 } })
    ).rejects.toMatchObject({ response: { status: 401 } })

    expect(localStorage.getItem('token')).toBeNull()
  })
})

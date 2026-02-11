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
  beforeEach(() => {
    mockClient.get.mockReset()
    mockClient.post.mockReset()
    mockClient.put.mockReset()
    mockClient.delete.mockReset()
    localStorage.clear()
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
})

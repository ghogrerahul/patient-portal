import { beforeEach, describe, expect, it, vi } from 'vitest'

const useQueryMock = vi.fn((options) => options)
const useMutationMock = vi.fn((options) => options)

const patientAPI = {
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

const appointmentAPI = {
  getAll: vi.fn(),
  create: vi.fn()
}

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock
}))

vi.mock('../services/api', () => ({
  patientAPI,
  appointmentAPI
}))

import {
  useAppointments,
  useCreateAppointment,
  useCreatePatient,
  usePatient,
  usePatients,
  useUpdatePatient
} from './useAPI'

describe('useAPI hooks', () => {
  beforeEach(() => {
    useQueryMock.mockClear()
    useMutationMock.mockClear()
    Object.values(patientAPI).forEach((fn) => fn.mockReset())
    Object.values(appointmentAPI).forEach((fn) => fn.mockReset())
  })

  it('builds patients query and executes expected API function', async () => {
    patientAPI.getAll.mockResolvedValue([{ id: 'p-1' }])
    const params = { page: 1 }

    const query = usePatients(params)
    const result = await query.queryFn()

    expect(useQueryMock).toHaveBeenCalledWith({
      queryKey: ['patients', params],
      queryFn: expect.any(Function)
    })
    expect(result).toEqual([{ id: 'p-1' }])
    expect(patientAPI.getAll).toHaveBeenCalledWith(params)
  })

  it('enables single patient query only when id exists', () => {
    usePatient('p-1')
    usePatient('')

    expect(useQueryMock).toHaveBeenNthCalledWith(1, {
      queryKey: ['patient', 'p-1'],
      queryFn: expect.any(Function),
      enabled: true
    })
    expect(useQueryMock).toHaveBeenNthCalledWith(2, {
      queryKey: ['patient', ''],
      queryFn: expect.any(Function),
      enabled: false
    })
  })

  it('builds mutation hooks with expected API methods', async () => {
    patientAPI.create.mockResolvedValue({ id: 'p-1' })
    patientAPI.update.mockResolvedValue({ id: 'p-1', name: 'Updated' })
    appointmentAPI.create.mockResolvedValue({ id: 'a-1' })

    const createPatient = useCreatePatient()
    const updatePatient = useUpdatePatient()
    const createAppointment = useCreateAppointment()

    await createPatient.mutationFn({ name: 'Alice' })
    await updatePatient.mutationFn({ id: 'p-1', data: { name: 'Updated' } })
    await createAppointment.mutationFn({ patientId: 'p-1' })

    expect(patientAPI.create).toHaveBeenCalledWith({ name: 'Alice' })
    expect(patientAPI.update).toHaveBeenCalledWith('p-1', { name: 'Updated' })
    expect(appointmentAPI.create).toHaveBeenCalledWith({ patientId: 'p-1' })
  })

  it('builds appointments query and executes expected API function', async () => {
    appointmentAPI.getAll.mockResolvedValue([{ id: 'a-1' }])
    const params = { date: '2026-02-11' }

    const query = useAppointments(params)
    const result = await query.queryFn()

    expect(useQueryMock).toHaveBeenCalledWith({
      queryKey: ['appointments', params],
      queryFn: expect.any(Function)
    })
    expect(result).toEqual([{ id: 'a-1' }])
    expect(appointmentAPI.getAll).toHaveBeenCalledWith(params)
  })
})

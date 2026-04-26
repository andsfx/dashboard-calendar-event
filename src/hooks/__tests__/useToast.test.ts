import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useToast } from '../useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('initializes with empty toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toEqual([])
  })

  it('adds toast message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast('success', 'Success', 'Operation completed')
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      title: 'Success',
      message: 'Operation completed',
    })
  })

  it('generates unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast('info', 'Info 1', 'Message 1')
    })
    
    const firstId = result.current.toasts[0].id
    
    // Wait a bit to ensure different timestamp
    vi.advanceTimersByTime(10)
    
    act(() => {
      result.current.showToast('info', 'Info 2', 'Message 2')
    })

    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[1].id).not.toBe(firstId)
  })

  it('removes toast by ID', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast('warning', 'Warning', 'Test warning')
    })

    const toastId = result.current.toasts[0].id

    act(() => {
      result.current.removeToast(toastId)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('auto-removes toast after 4 seconds', async () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast('error', 'Error', 'Test error')
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('supports multiple toast types', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showToast('success', 'Success', 'Success message')
      result.current.showToast('error', 'Error', 'Error message')
      result.current.showToast('warning', 'Warning', 'Warning message')
      result.current.showToast('info', 'Info', 'Info message')
    })

    expect(result.current.toasts).toHaveLength(4)
    expect(result.current.toasts.map(t => t.type)).toEqual(['success', 'error', 'warning', 'info'])
  })
})

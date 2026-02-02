'use client'

import { createContext, useContext, useState } from 'react'
import { Toast, ToastType } from '../common/Toast'

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<ToastType>('success')

  const showToast = (message: string, type: ToastType) => {
    setMessage(message)
    setType(type)
    setShow(true)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={message}
        type={type}
        show={show}
        onClose={() => setShow(false)}
      />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

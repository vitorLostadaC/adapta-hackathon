import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { v4 } from 'uuid'
import { Header } from './Header'
import { Toast } from './Toast'

type ToastType = {
  key: string | number
  message: string
}

const socket = io('http://localhost:3333')

export const Widget = () => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  useEffect(() => {
    socket.connect()

    socket.on('message', (message) => {
      handleAddToast(message)
    })

    return () => {
      socket.off('message')
    }
  }, [])

  const handleAddToast = (message: string) => {
    setToasts((prevState) => [
      ...prevState,
      {
        key: v4(),
        message
      }
    ])
  }

  const handleRemoveToast = (key: string | number) => {
    setToasts((prevState = []) => prevState.filter((toast) => toast.key !== key))
  }

  return (
    <div className="h-full">
      <Header />

      {toasts?.map((toast) => (
        <Toast key={toast.key} onComplete={() => handleRemoveToast(toast.key)}>
          {toast.message}
        </Toast>
      ))}

      <div className="h-full w-full mt-5 bg-white opacity-5 rounded-md"></div>
    </div>
  )
}

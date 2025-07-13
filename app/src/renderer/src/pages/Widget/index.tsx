import { useState } from 'react'
import { v4 } from 'uuid'

import { Header } from './Header'
import { Toast } from './Toast'

type ToastType = {
  key: string | number
  message: string
}

export const Widget = () => {
  const [toasts, setToasts] = useState<ToastType[]>()

  const handleAddToast = () => {
    setToasts((prevState = []) => [
      ...prevState,
      {
        key: v4(),
        message: 'teste'
      }
    ])
  }

  const handleRemoveToast = (key: string | number) => {
    setToasts((prevState = []) => prevState.filter((toast) => toast.key !== key))
  }

  return (
    <div className="h-full">
      <Header testeToast={() => handleAddToast()} />

      {toasts?.map((toast) => (
        <Toast key={toast.key} onComplete={() => handleRemoveToast(toast.key)}>
          {toast.message}
        </Toast>
      ))}

      <div className="h-full w-full mt-5 bg-white opacity-5 rounded-md"></div>
    </div>
  )
}

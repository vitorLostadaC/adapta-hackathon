import { ToastContainer, toast, Zoom } from 'react-toastify'
import { useEffect } from 'react'

import { Header } from './Header'

export const Widget = () => {
  useEffect(() => {
    toast('Wow so easy!')
  }, [])

  return (
    <div className="h-full">
      <Header />

      <div className="h-full w-full mt-5 bg-white opacity-5 rounded-md" />

      <ToastContainer
        toastClassName="w-[40px] rounded-md bg-gray-700 top-25"
        progressClassName="bg-green-500"
        theme={undefined}
        position="top-center"
        autoClose={5000}
        transition={Zoom}
        pauseOnHover
        closeOnClick={false}
        closeButton={false}
      />
    </div>
  )
}

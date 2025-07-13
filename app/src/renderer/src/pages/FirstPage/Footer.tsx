import { useState } from 'react'
import { FaMicrophone, FaCircleStop } from 'react-icons/fa6'

export const Footer = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false)

  return (
    <div className="w-full h-full flex justify-center items-center">
      <button
        type="button"
        className="flex items-center gap-2 h-9 px-4 rounded-full bg-gray-700"
        onClick={() => setIsRecording((prevState) => !prevState)}
      >
        <div>
          {isRecording ? (
            <FaCircleStop className="text-red-700" size={20} />
          ) : (
            <FaMicrophone className="text-green-600" size={20} />
          )}
        </div>

        <span className="text-gray-200">00:00:00</span>
      </button>
    </div>
  )
}

import { useState } from 'react'
import { FaMicrophone, FaCircleStop } from 'react-icons/fa6'

export const Header = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false)

  return (
    <div className="w-full flex items-center justify-center shadow-xl region-drag bg-gray-950 h-20 rounded-md px-10">
      <button
        type="button"
        className="region-noDrag"
        onClick={() => setIsRecording((prevState) => !prevState)}
      >
        {isRecording ? (
          <FaCircleStop className="text-red-700 hover:text-red-800" size={20} />
        ) : (
          <FaMicrophone className="text-green-600 hover:text-green-700" size={20} />
        )}
      </button>

      <span className="text-gray-500 region-noDrag ml-4">00:00:00</span>
    </div>
  )
}

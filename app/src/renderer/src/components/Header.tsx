import { useState } from 'react'
import { FaMicrophone, FaCircleStop } from 'react-icons/fa6'

export const Header = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false)

  return (
    <div className="w-full flex items-center region-noDrag bg-gray-950 h-9">
      <button type="button" onClick={() => setIsRecording((prevState) => !prevState)}>
        {isRecording ? (
          <FaCircleStop className="text-red-700" size={20} />
        ) : (
          <FaMicrophone className="text-green-600" size={20} />
        )}
      </button>

      {isRecording && <span className="ml-6 text-gray-600">00:00:00</span>}
    </div>
  )
}

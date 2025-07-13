type ListProps = {
  items: {
    key: number | string
    message: string
  }[]
}

export const List = ({ items }: ListProps) => {
  return (
    <div className="w-full p-5 h-full flex flex-col items-center gap-4 overflow-auto">
      {items.map((item) => (
        <div key={item.key} className="w-full rounded-md px-4 py-4 max-w-[600px] bg-gray-700">
          <p>{item.message}</p>
        </div>
      ))}
    </div>
  )
}

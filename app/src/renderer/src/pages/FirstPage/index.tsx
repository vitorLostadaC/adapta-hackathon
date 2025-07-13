import { useId, useState } from 'react'
import { Footer } from './Footer'
import { List } from './List'

type ListDataType = {
  key: number | string
  message: string
}

export function FirstPage() {
  const [listData, setListData] = useState<ListDataType[]>([
    {
      key: useId(),
      message: 'teste 1'
    },
    {
      key: useId(),
      message: 'teste 2'
    },
    {
      key: useId(),
      message: 'teste 3'
    },
    {
      key: useId(),
      message: 'teste 4'
    },
    {
      key: useId(),
      message: 'teste 5'
    }
  ])

  return (
    <div className="h-screen w-screen grid grid-rows-[auto_60px]">
      <List items={listData} />

      <Footer />
    </div>
  )
}

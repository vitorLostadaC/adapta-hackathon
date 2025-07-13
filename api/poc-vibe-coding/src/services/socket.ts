import io from 'socket.io-client'

const socket = io('http://localhost:3333', {
  query: {
    sessionId: '123'
  }
})

export default socket

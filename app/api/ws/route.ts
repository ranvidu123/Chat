import { NextApiRequest } from 'next'
import { NextApiResponseServerIO } from '@/types/next'
import { Server as ServerIO } from 'socket.io'
import { Server as NetServer } from 'http'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log('New Socket.io server...')
    // adapt Next's net Server to http Server
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: '/api/ws',
    })
    // append SocketIO server to Next.js socket server response
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('New client connected')

      socket.on('join-room', (conversationId) => {
        socket.join(conversationId)
      })

      socket.on('send-message', (message) => {
        io.to(message.conversationId).emit('new-message', message)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected')
      })
    })
  }
  res.end()
}


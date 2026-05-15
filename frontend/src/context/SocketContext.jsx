import { createContext, useContext, useEffect, useRef, useState } from 'react'
import useAuthStore from '../store/authStore'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
    const { token, user } = useAuthStore()
    const socket = useRef(null)
    const [onlineUsers, setOnlineUsers] = useState(new Set())
    const [lastEvent, setLastEvent] = useState(null)

    useEffect(() => {
        if (!token || !user) {
            if (socket.current) {
                socket.current.close()
                socket.current = null
            }
            return
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        
        const ws = new WebSocket(`${protocol}//${host}/api/messages/ws?token=${token}`)
        socket.current = ws

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            setLastEvent(data)

            if (data.type === 'user_status') {
                setOnlineUsers(prev => {
                    const next = new Set(prev)
                    if (data.is_online) next.add(Number(data.user_id))
                    else next.delete(Number(data.user_id))
                    return next
                })
            }
        }

        return () => {
            ws.close()
            socket.current = null
        }
    }, [token, user])

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, lastEvent }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)

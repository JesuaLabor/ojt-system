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

        // Add a small delay to avoid "closed before established" during HMR
        const timeoutId = setTimeout(() => {
            let wsUrl = ''
            const apiURL = import.meta.env.VITE_API_URL
            
            if (apiURL && apiURL.startsWith('http')) {
                // Production: Use the absolute API URL host
                const wsProtocol = apiURL.startsWith('https') ? 'wss:' : 'ws:'
                const host = apiURL.replace(/^https?:\/\//, '').split('/')[0]
                wsUrl = `${wsProtocol}//${host}/api/messages/ws?token=${token}`
            } else {
                // Local/Relative: Use the current browser host (proxy handles this)
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
                wsUrl = `${protocol}//${window.location.host}/api/messages/ws?token=${token}`
            }

            const ws = new WebSocket(wsUrl)
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

            ws.onerror = (err) => {
                console.error('WebSocket Error:', err)
            }

            ws.onclose = () => {
                console.log('WebSocket Connection Closed')
            }
        }, 500)

        return () => {
            clearTimeout(timeoutId)
            if (socket.current) {
                socket.current.close()
                socket.current = null
            }
        }
    }, [token, user])

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, lastEvent }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)

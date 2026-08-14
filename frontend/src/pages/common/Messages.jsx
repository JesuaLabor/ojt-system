import { useState, useEffect, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBadgeStore from '../../store/badgeStore'
import { useSocket } from '../../context/SocketContext'

export default function Messages() {
    const { user } = useAuthStore()
    const { clear, setBadge } = useBadgeStore()
    const [contacts, setContacts] = useState([])
    const [activeContact, setActiveContact] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loadingContacts, setLoadingContacts] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [otherUserTyping, setOtherUserTyping] = useState(false)
    const [showEmojis, setShowEmojis] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [chatSearchQuery, setChatSearchQuery] = useState('')
    const [showSharedMedia, setShowSharedMedia] = useState(false)
    const [isSearchingInChat, setIsSearchingInChat] = useState(false)

    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const { socket, lastEvent, onlineUsers } = useSocket()
    const activeContactRef = useRef(null)
    
    useEffect(() => {
        activeContactRef.current = activeContact
    }, [activeContact])

    // ── WebSocket Logic ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!lastEvent) return
        const data = lastEvent

        if (data.type === 'new_message') {
            const msg = data.message
            const currentActive = activeContactRef.current
            if (currentActive && (Number(msg.sender_id) === Number(currentActive.ID || currentActive.id))) {
                setMessages(prev => [...prev, msg])
            }
            fetchContacts(true)
        } else if (data.type === 'reaction') {
            const updatedMsg = data.message
            setMessages(prev => prev.map(m => m.ID === updatedMsg.ID ? updatedMsg : m))
        } else if (data.type === 'typing') {
            const currentActive = activeContactRef.current
            if (currentActive && (Number(data.sender_id) === Number(currentActive.ID || currentActive.id))) {
                setOtherUserTyping(data.is_typing)
            }
        } else if (data.type === 'messages_read') {
            const currentActive = activeContactRef.current
            if (currentActive && (Number(data.reader_id) === Number(currentActive.ID || currentActive.id))) {
                setMessages(prev => prev.map(m => ({ ...m, is_read: true })))
            }
        } else if (data.type === 'user_status') {
            setContacts(prev => prev.map(c => 
                (Number(c.ID || c.id) === Number(data.user_id)) 
                ? { ...c, is_online: data.is_online, last_seen: new Date().toISOString() } 
                : c
            ))
        }
    }, [lastEvent])

    const sendTypingStatus = (typing) => {
        if (socket.current?.readyState === WebSocket.OPEN && activeContact) {
            socket.current.send(JSON.stringify({
                type: 'typing',
                receiver_id: activeContact.ID || activeContact.id,
                is_typing: typing
            }))
        }
    }

    const handleInputChange = (e) => {
        setNewMessage(e.target.value)
        if (!isTyping) {
            setIsTyping(true)
            sendTypingStatus(true)
        }
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            sendTypingStatus(false)
        }, 2000)
    }

    // ── Data Fetching ────────────────────────────────────────────────────────
    const fetchContacts = async (silent = false) => {
        if (!silent) setLoadingContacts(true)
        try {
            const res = await api.get('/messages/contacts')
            setContacts(res.data.contacts || [])
        } catch (err) {
            if (!silent) toast.error('Failed to load contacts')
        } finally {
            if (!silent) setLoadingContacts(false)
        }
    }

    useEffect(() => {
        fetchContacts()
        // Clear badge immediately when user opens the Messages page
        clear('unreadMessages')
    }, [])

    useEffect(() => {
        if (activeContact) {
            fetchConversation(activeContact.ID || activeContact.id)
        }
    }, [activeContact])

    useEffect(() => {
        if (activeContact) {
            scrollToBottom()
        }
    }, [messages])

    const fetchConversation = async (contactId) => {
        setLoadingMessages(true)
        try {
            const res = await api.get(`/messages/conversation/${contactId}`)
            setMessages(res.data.messages || [])
            fetchContacts(true)
            // Re-sync unread count after opening a conversation (backend marks as read)
            api.get('/messages/unread')
                .then(r => setBadge('unreadMessages', r.data?.unread_count || 0))
                .catch(() => {})
        } catch (err) {
            toast.error('Failed to load conversation')
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if ((!newMessage.trim() && !selectedFile) || !activeContact) return

        const formData = new FormData()
        formData.append('receiver_id', activeContact.ID || activeContact.id)
        formData.append('content', newMessage)
        if (selectedFile) formData.append('file', selectedFile)

        const tempMsg = {
            ID: Date.now(),
            sender_id: user.ID || user.id,
            content: newMessage,
            file_url: selectedFile ? URL.createObjectURL(selectedFile) : null,
            file_type: selectedFile?.type.startsWith('image/') ? 'image' : 'document',
            CreatedAt: new Date().toISOString(),
            is_sending: true
        }

        setMessages(prev => [...prev, tempMsg])
        setNewMessage('')
        setSelectedFile(null)

        try {
            const res = await api.post('/messages', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            setMessages(prev => prev.map(m => m.is_sending && m.content === tempMsg.content ? res.data.message : m))
            fetchContacts(true)
        } catch (err) {
            toast.error('Failed to send message')
            setMessages(prev => prev.filter(m => !m.is_sending))
        }
    }

    const handleReact = async (messageId, emoji) => {
        try {
            // Optimistic update
            setMessages(prev => prev.map(m => m.ID === messageId ? { ...m, reaction: emoji } : m))
            await api.put(`/messages/${messageId}/react`, { reaction: emoji })
        } catch (err) {
            toast.error('Failed to react to message')
        }
    }

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const filteredMessages = messages.filter(m =>
        m.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
    )

    const sharedMedia = messages.filter(m => m.file_url)
    const sharedImages = sharedMedia.filter(m => m.file_type === 'image')
    const sharedDocs = sharedMedia.filter(m => m.file_type !== 'image')

    // Derived active contact with real-time status override
    const currentContactRaw = contacts.find(c => Number(c.ID || c.id) === Number(activeContact?.ID || activeContact?.id)) || activeContact;
    const currentContact = currentContactRaw ? {
        ...currentContactRaw,
        is_online: currentContactRaw.is_online || onlineUsers.has(Number(currentContactRaw.ID || currentContactRaw.id))
    } : null;

    const lastReadMessageId = [...messages]
        .reverse()
        .find(m => m.is_read && Number(m.sender_id || m.SenderID) === Number(user?.ID || user?.id))?.ID;

    const formatLastSeen = (dateStr) => {
        if (!dateStr) return 'Offline';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Offline';
            return `Active ${formatDistanceToNow(date, { addSuffix: true })}`;
        } catch (e) {
            return 'Offline';
        }
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        return format(date, 'MMM d');
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-[#0B0D14] rounded-3xl overflow-hidden border border-slate-800/40">
            {/* Left Sidebar */}
            <div className={`w-full md:w-72 bg-[#0B0D14] flex flex-col border-r border-slate-800/40 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 pb-2">
                    <h1 className="text-2xl font-bold text-white mb-6">Messages</h1>
                    <div className="relative group">
                        <svg className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1A1D26] border-none rounded-full pl-11 pr-4 py-3 text-sm text-slate-300 focus:ring-0 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
                    {filteredContacts.map(c => {
                        const contactId = c.ID || c.id;
                        const activeId = activeContact?.ID || activeContact?.id;
                        const isActive = activeId && contactId === activeId;
                        const hasUnread = c.unread_count > 0;
                        const isOnline = c.is_online || onlineUsers.has(Number(contactId));

                        return (
                            <button
                                key={contactId}
                                onClick={() => setActiveContact(c)}
                                className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition-all relative group ${isActive ? 'bg-[#3F4EE8] shadow-[0_8px_30px_rgb(63,78,232,0.4)]' : hasUnread ? 'bg-[#3F4EE8]/10 border border-indigo-500/20' : 'hover:bg-white/5'}`}
                            >

                                    <div className="relative shrink-0">
                                        {c.profile_photo ? (
                                            <img src={c.profile_photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                                        ) : (
                                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                {c.name.charAt(0)}
                                            </div>
                                        )}
                                        {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B0D14]"></div>}
                                    </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>{c.name}</p>
                                        {c.department?.name && (
                                            <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border ${isActive ? 'bg-white/20 border-white/20 text-white' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                                                {c.department.name}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-[12px] font-medium truncate mt-0.5 ${isActive ? 'text-indigo-100/90' : hasUnread ? 'text-white' : 'text-slate-500'}`}>
                                        {c.has_conversation ? (
                                            <>
                                                {c.is_last_sender ? 'You: ' : ''}{c.last_message}
                                                <span className="opacity-70 ml-1">· {formatTimeAgo(c.last_message_at)}</span>
                                            </>
                                        ) : (
                                            'Start a conversation'
                                        )}
                                    </p>
                                </div>
                                {c.unread_count > 0 && !isActive && (
                                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-900/40"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

            </div>

            {/* Chat Pane */}
            <div className={`flex-1 flex flex-row bg-[#0B0D14] ${activeContact ? 'flex' : 'hidden md:flex'} overflow-hidden`}>
                <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/40 relative">
                {activeContact ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between bg-[#0B0D14]/80 backdrop-blur-md sticky top-0 z-20">
                            {isSearchingInChat ? (
                                <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <button onClick={() => { setIsSearchingInChat(false); setChatSearchQuery('') }} className="text-slate-500 hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Search messages..."
                                        value={chatSearchQuery}
                                        onChange={(e) => setChatSearchQuery(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setActiveContact(null)} className="md:hidden text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                                        <div className="relative">
                                            {currentContact.profile_photo ? <img src={currentContact.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#3F4EE8] flex items-center justify-center text-white font-bold">{currentContact.name.charAt(0)}</div>}
                                            {currentContact.is_online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0B0D14]"></div>}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white leading-tight">{currentContact.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${currentContact.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${currentContact.is_online ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {otherUserTyping ? 'Typing...' : currentContact.is_online ? 'Online' : formatLastSeen(currentContact.last_seen)}
                                                    </p>
                                                </div>
                                                {currentContact.department?.name && (
                                                    <>
                                                        <span className="text-slate-800 text-[10px]">•</span>
                                                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                                            <svg className="w-2.5 h-2.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{activeContact.department.name}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsSearchingInChat(true)} className="text-slate-500 hover:text-white p-2 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                                        <button onClick={() => setShowSharedMedia(!showSharedMedia)} className={`p-2 transition-colors ${showSharedMedia ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                            {filteredMessages.length === 0 && chatSearchQuery && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-in fade-in duration-500">
                                    <div className="w-16 h-16 bg-slate-800/30 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <p className="text-sm font-medium">No messages matching "{chatSearchQuery}"</p>
                                </div>
                            )}

                            {filteredMessages.map((m, idx) => {
                                const senderId = m.sender_id || m.SenderID;
                                const isMe = Number(senderId) === Number(user?.ID || user?.id);
                                return (
                                    <div key={m.ID} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] ${isMe ? 'self-end' : 'self-start'} relative`}>
                                        <div className={`p-4 shadow-sm relative group ${isMe ? 'bg-gradient-to-br from-[#3F4EE8] to-[#4F46E5] text-white rounded-[20px] rounded-tr-md' : 'bg-[#1A1D26] text-slate-200 rounded-[20px] rounded-tl-md'}`}>
                                            {m.content && <p className="text-[13px] leading-relaxed font-medium">{m.content}</p>}
                                            {m.file_url && (
                                                <div className={m.content ? "mt-3" : ""}>
                                                    {m.file_type === 'image' ? (
                                                        <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => window.open(m.file_url)}>
                                                            <img src={m.file_url} alt="Shared" className="max-w-[200px] sm:max-w-[300px] object-contain rounded-xl" />
                                                        </div>
                                                    ) : (
                                                        <a href={m.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-all border border-white/5">
                                                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white">
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold text-white truncate max-w-[150px]">View Attachment</p>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reactions Display */}
                                            {m.reaction && (
                                                <div className={`absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} bg-[#1A1D26] border border-slate-700/50 rounded-full px-1.5 py-0.5 text-xs shadow-lg animate-in zoom-in-50 duration-300 cursor-default select-none`}>
                                                    {m.reaction}
                                                </div>
                                            )}

                                            {/* Quick Reactions on Hover */}
                                            <div className={`absolute top-0 ${isMe ? '-left-36' : '-right-36'} opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 p-1.5 bg-[#1A1D26] border border-slate-700/50 rounded-full shadow-xl z-10 scale-90 group-hover:scale-100`}>
                                                {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleReact(m.ID, emoji)}
                                                        className={`hover:scale-125 transition-transform px-1 ${m.reaction === emoji ? 'bg-indigo-500/20 rounded-md' : ''}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1.5 px-1">
                                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{format(new Date(m.CreatedAt), 'h:mm a')}</span>
                                            {isMe && (
                                                <div className="flex items-center">
                                                    {m.is_read ? (
                                                        m.ID === lastReadMessageId && (
                                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-[#0B0D14] ring-1 ring-slate-800 animate-in zoom-in-50 duration-300">
                                                                {activeContact.profile_photo ? (
                                                                    <img src={activeContact.profile_photo} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-[#3F4EE8] flex items-center justify-center text-[8px] text-white font-black">
                                                                        {activeContact.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center bg-transparent">
                                                            <svg className="w-2.5 h-2.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#0B0D14] border-t border-slate-800/40">
                            {selectedFile && (
                                <div className="mb-3 p-3 bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-700/50 animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">📁</div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-white font-bold truncate max-w-[200px]">{selectedFile.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black">Ready to send</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-white">✕</button>
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-[#1A1D26] p-2 rounded-[24px] border border-slate-700/30 focus-within:border-indigo-500/50 transition-all shadow-lg">
                                <div className="flex items-center gap-1 px-1">
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-2 text-slate-400 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                        {showEmojis && (
                                            <div className="absolute bottom-14 left-0 bg-[#1A1D26] border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 flex gap-2 w-max animate-in slide-in-from-bottom-2 duration-200">
                                                {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                                                    <button key={emoji} type="button" onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojis(false) }} className="text-xl hover:scale-125 transition-transform p-1">{emoji}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white transition-colors relative">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        {selectedFile && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#1A1D26]"></div>}
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} />
                                </div>
                                <input type="text" value={newMessage} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 text-sm py-2" />
                                <button type="submit" disabled={!newMessage.trim() && !selectedFile} className="bg-[#3F4EE8] hover:bg-[#4F46E5] disabled:opacity-50 disabled:hover:bg-[#3F4EE8] text-white p-2.5 rounded-full transition-all shadow-lg shadow-indigo-900/20 active:scale-95"><svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0B0D14] relative overflow-hidden">
                        {/* Abstract Background Elements */}
                        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10 max-w-sm">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-900/40 rotate-3 animate-bounce-subtle">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-3 tracking-tight">OJT Messenger</h2>
                            <p className="text-slate-500 text-sm leading-relaxed font-medium">Select a colleague or supervisor from the list to start a high-security conversation. All shared files are encrypted.</p>
                            <div className="mt-8 flex flex-wrap justify-center gap-2">
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted</span>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time</span>
                            </div>
                        </div>
                    </div>
                )}
                </div>

                {/* Shared Media Sidebar */}
                {activeContact && showSharedMedia && (
                    <div className="w-80 bg-[#0B0D14] border-l border-slate-800/40 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Conversation Info</h3>
                            <button onClick={() => setShowSharedMedia(false)} className="text-slate-500 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                            <div className="text-center pb-4">
                                <div className="w-20 h-20 mx-auto mb-3 relative">
                                    {currentContact.profile_photo ? <img src={currentContact.profile_photo} alt="" className="w-full h-full rounded-full object-cover border-2 border-indigo-500/20" /> : <div className="w-full h-full rounded-full bg-[#3F4EE8] flex items-center justify-center text-2xl text-white font-bold">{currentContact.name.charAt(0)}</div>}
                                    {currentContact.is_online && <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#0B0D14]"></div>}
                                </div>
                                <h4 className="text-sm font-bold text-white">{currentContact.name}</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{currentContact.department?.name || 'No Department'}</p>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Shared Images ({sharedImages.length})
                                </h5>
                                {sharedImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {sharedImages.map(img => (
                                            <div key={img.ID} className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group" onClick={() => window.open(img.file_url)}>
                                                <img src={img.file_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-600 italic">No images shared yet</p>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Files & Documents ({sharedDocs.length})
                                </h5>
                                {sharedDocs.length > 0 ? (
                                    <div className="space-y-2">
                                        {sharedDocs.map(doc => (
                                            <a key={doc.ID} href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                                                <div className="w-8 h-8 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/30">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-white truncate">Shared Document</p>
                                                    <p className="text-[9px] text-slate-500">{format(new Date(doc.CreatedAt), 'MMM d, h:mm a')}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-600 italic">No documents shared yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { getMyMessages, markMessageRead, replyToMessage, type ServiceMessage } from '@/api/marketplace'
import { useAuth } from '@/auth/AuthContext'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

function threadKey(message: ServiceMessage, userId: string) {
  const other = message.senderId === userId ? message.receiverId : message.senderId
  return `${message.serviceId}:${other}`
}

export function MessagesPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ServiceMessage[]>([])
  const [selected, setSelected] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setMessages(await getMyMessages())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '消息加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const threads = useMemo(() => {
    const groups = new Map<string, ServiceMessage[]>()
    for (const message of messages) {
      const key = threadKey(message, user?.id || '')
      groups.set(key, [...(groups.get(key) || []), message])
    }
    return [...groups.entries()].map(([key, list]) => ({ key, list: list.sort((a, b) => a.createTime - b.createTime) }))
  }, [messages, user?.id])
  const activeKey = selected || threads[0]?.key
  const active = threads.find((thread) => thread.key === activeKey)

  async function selectThread(key: string) {
    setSelected(key)
    const unread = threads.find((thread) => thread.key === key)?.list.filter((message) => !message.isMine && !message.isRead) || []
    if (!unread.length) return
    const results = await Promise.allSettled(unread.map((message) => markMessageRead(message.id)))
    const markedIds = new Set(unread.filter((_, index) => results[index].status === 'fulfilled').map((message) => message.id))
    setMessages((list) => list.map((message) => markedIds.has(message.id) ? { ...message, isRead: true } : message))
    if (results.some((result) => result.status === 'rejected')) toast.error('部分消息标记已读失败，请稍后重试')
  }

  async function submitReply() {
    const content = reply.trim()
    const lastIncoming = [...(active?.list || [])].reverse().find((message) => !message.isMine)
    if (!content || !lastIncoming) return
    setBusy(true)
    try {
      await replyToMessage(lastIncoming.id, content)
      setReply('')
      await load()
      toast.success('回复已发送')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败')
    } finally {
      setBusy(false)
    }
  }

  return <div className="min-h-screen bg-[#f8f9fc]">
    <NavBar />
    <main className="max-w-[1150px] mx-auto px-6 pt-28 pb-20 min-h-[75vh]">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">消息中心</h1>
      <p className="text-sm text-gray-500 mb-6">查看商品咨询，并在对话中回复。</p>
      {loading ? <p className="text-gray-500">加载中…</p> : threads.length === 0 ?
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">还没有消息。<Link className="text-blue-600 ml-2" to="/market">浏览算法市场</Link></div> :
        <div className="grid md:grid-cols-[300px_1fr] bg-white rounded-2xl border border-gray-100 overflow-hidden min-h-[480px]">
          <div className="border-r border-gray-100">{threads.map(({ key, list }) => {
            const newest = list[list.length - 1]
            const other = newest.senderId === user?.id ? newest.receiverName : newest.senderName
            const unread = list.some((message) => !message.isMine && !message.isRead)
            return <button key={key} onClick={() => void selectThread(key)} className={`block w-full p-4 text-left border-b border-gray-100 ${key === activeKey ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold text-sm text-gray-900 truncate">{newest.serviceName || '算法商品'}</span>{unread && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}</div>
              <div className="text-xs text-gray-500 mt-1">与 {other || '用户'} 的对话</div>
              <div className="text-xs text-gray-400 mt-2 truncate">{newest.content}</div>
            </button>
          })}</div>
          {active && <div className="flex flex-col min-w-0">
            <div className="p-4 border-b border-gray-100 font-semibold text-sm text-gray-800">{active.list[0].serviceName || '算法商品'} <Link className="text-blue-600 font-normal ml-2" to={`/products/${active.list[0].serviceId}`}>查看商品</Link></div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[460px]">{active.list.map((message) => <div key={message.id} className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-xl p-3 text-sm whitespace-pre-wrap ${message.isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}><div>{message.content}</div><div className={`text-[10px] mt-2 ${message.isMine ? 'text-blue-100' : 'text-gray-400'}`}>{new Date(message.createTime).toLocaleString()}</div></div></div>)}</div>
            <div className="p-4 border-t border-gray-100 flex gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} maxLength={2000} placeholder="输入回复…" className="flex-1 border border-gray-200 rounded-xl p-3 text-sm resize-none" /><button disabled={busy || !reply.trim()} onClick={() => void submitReply()} className="px-5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">发送</button></div>
          </div>}
        </div>}
    </main>
    <Footer />
  </div>
}

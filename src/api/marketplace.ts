import { apiClient } from './client'
import { onlyAlgorithmModels, type BackendService } from '@/lib/mappers'

type ServiceListResponse = { services?: BackendService[] }

export async function getInterestedAlgorithms() {
  const res: ServiceListResponse = await apiClient.get('/services/user/interested')
  return onlyAlgorithmModels(res.services || [])
}

export async function addInterested(serviceId: string) {
  return apiClient.post(`/services/${serviceId}/relation`, { relationType: 'interested' })
}

export async function removeInterested(serviceId: string) {
  return apiClient.delete(`/services/${serviceId}/relation`, { params: { relation_type: 'interested' } })
}

export interface ServiceMessage {
  id: number
  serviceId: string
  serviceName: string
  senderId: string
  senderName: string
  receiverId: string
  receiverName: string
  content: string
  isRead: boolean
  isMine: boolean
  createTime: number
}

type MessageListResponse = { messages?: ServiceMessage[] }

export async function getMyMessages(): Promise<ServiceMessage[]> {
  const res: MessageListResponse = await apiClient.get('/messages/user')
  return res.messages || []
}

export async function sendInquiry(serviceId: string, content: string) {
  return apiClient.post('/messages/contact-purchase', { serviceId, content })
}

export async function replyToMessage(messageId: number, content: string) {
  return apiClient.post(`/messages/${messageId}/reply`, { content })
}

export async function markMessageRead(messageId: number) {
  return apiClient.post(`/messages/${messageId}/mark-read`)
}

'use client'

import { useState, useEffect } from 'react'
import * as openpgp from 'openpgp'
import { useChat } from 'ai/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/hooks/useAuth'
import { ConversationList } from '@/components/ConversationList'
import { ContactList } from '@/components/ContactList'

export default function PGPChat() {
  const { user, login, logout } = useAuth()
  const [activeConversation, setActiveConversation] = useState(null)
  const [userKeys, setUserKeys] = useState<any>(null)
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat()

  useEffect(() => {
    if (user) {
      loadOrGenerateKeys()
    }
  }, [user])

  async function loadOrGenerateKeys() {
    // Load keys from user profile or generate new ones
    // This is a simplified version; in a real app, you'd want to securely store the private key
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{ name: user.name, email: user.email }],
      passphrase: 'super secret passphrase'
    })
    setUserKeys({ privateKey, publicKey })
    // In a real app, you'd want to save the public key to the user's profile
  }

  async function encryptMessage(message: string, recipientPublicKey: string) {
    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: message }),
      encryptionKeys: await openpgp.readKey({ armoredKey: recipientPublicKey }),
    })
    return encrypted
  }

  async function decryptMessage(encryptedMessage: string) {
    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage
    })
    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: await openpgp.readPrivateKey({ armoredKey: userKeys.privateKey })
    })
    return decrypted
  }

  const handlePGPSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input || !activeConversation) return
    const encryptedMessage = await encryptMessage(input, activeConversation.recipientPublicKey)
    // In a real app, you'd send this message to the server here
    handleSubmit(e, { data: { encrypted: encryptedMessage } })
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            login(formData.get('email') as string, formData.get('password') as string)
          }}>
            <Input name="email" type="email" placeholder="Email" className="mb-2" />
            <Input name="password" type="password" placeholder="Password" className="mb-2" />
            <Button type="submit">Login</Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-4 flex">
      <div className="w-1/4 pr-4">
        <ConversationList 
          conversations={[]} // You'd fetch this from your API
          setActiveConversation={setActiveConversation}
        />
        <ContactList 
          contacts={[]} // You'd fetch this from your API
          startNewConversation={(contact) => {
            // Logic to start a new conversation
          }}
        />
      </div>
      <div className="w-3/4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{activeConversation ? `Chat with ${activeConversation.recipientName}` : 'Select a conversation'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[60vh] overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg p-2 ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <form onSubmit={handlePGPSubmit} className="flex w-full space-x-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={!activeConversation}
              />
              <Button type="submit" disabled={!activeConversation}>Send</Button>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}


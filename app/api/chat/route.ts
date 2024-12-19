import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'
import * as openpgp from 'openpgp'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messages, data } = await req.json()
  const lastMessage = messages[messages.length - 1]

  // Decrypt the message
  const privateKey = await openpgp.readPrivateKey({ armoredKey: process.env.SERVER_PRIVATE_KEY })
  const message = await openpgp.readMessage({
    armoredMessage: data.encrypted
  })
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey
  })

  const prompt = [
    { role: 'system', content: 'You are a helpful assistant in a PGP encrypted chat.' },
    ...messages.slice(0, -1),
    { role: lastMessage.role, content: decrypted }
  ]

  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: prompt
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}


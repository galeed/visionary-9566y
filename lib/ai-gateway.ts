export interface GatewayMetadata {
  cost: string,
  marketCost: string,
  generationId: string,
}

export class AiGatewayError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = "AiGatewayError"
    this.status = status
  }
}

export async function fetchAiGateway<T>(endpoint: string, apiKey: string): Promise<T> {
  const response = await fetch(`https://ai-gateway.vercel.sh${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new AiGatewayError(
      `Failed to fetch AI Gateway API: ${response.status} ${response.statusText}`,
      response.status
    )
  }

  return response.json() as T
}

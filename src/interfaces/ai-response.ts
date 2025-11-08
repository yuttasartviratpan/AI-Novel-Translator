
export interface AIResponse {
    response: string,
    status: number
}

export function AIResponseBuilder(response: string, status: number) {
    const aiResponse: AIResponse = {
        response: response,
        status: status
    }

    return aiResponse;
}

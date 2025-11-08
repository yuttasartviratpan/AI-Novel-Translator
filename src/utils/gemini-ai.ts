import { GoogleGenAI, ApiError, HarmCategory, HarmBlockThreshold, type Chat} from '@google/genai';
import {GEMINI_API_KEY} from '../constants/environments'
import {AI_INITIAL_PROMPT, AI_TRANSLATION_PROMPT} from '../constants/prompts'
import { AIResponse, AIResponseBuilder } from '../interfaces/ai-response';
import { Delay } from './delay';

const ai = new GoogleGenAI({ vertexai: false, apiKey: GEMINI_API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// Return AI Chat Context
export async function InitializeAI() {

    // Initial Setting Prompt
    const initial_prompt = AI_INITIAL_PROMPT;

    const translation_role_prompt = AI_TRANSLATION_PROMPT

    const chat = ai.chats.create({
        model: "gemini-2.5-pro",
        history: [],
        config: {
            safetySettings: safetySettings,
            thinkingConfig: {
                thinkingBudget: -1,
            },
        }
    });

    console.log("Injecting Setting Prompt");
    const init_response = await chat.sendMessage({
        message: initial_prompt,
    })
    console.log("Gemini Initial Setting Response: \n", init_response.text);

    console.log("\n");

    // Delay 1.5 mins for quota
    await Delay(90000);

    console.log("Injecting Translation Role Prompt");
    const translation_role_response = await chat.sendMessage({
        message: translation_role_prompt,
    })
    console.log("Gemini Translation Role Response: \n", translation_role_response.text);

    // Delay another 1.5 mins for quota
    await Delay(90000);

    return chat;

}

// If status 200, OK, proceed.
// If status [500, 503], Internal Error (Model Overloaded), retry.
// If status [429], Too Many Request (Quota Reached), stop the whole program.
// Other status, stop the whole program as well. 
export async function SendAIRequest(chat: Chat, content: string) {
    try {
        const response = await chat.sendMessage({
            message: content,
        })
        
        const aiResponse: AIResponse = AIResponseBuilder(response.text ?? "", 200)

        return aiResponse;
    } catch (error) {
        if (error instanceof ApiError) {
            const aiResponse: AIResponse = AIResponseBuilder(error.message, error.status)
            return aiResponse;
        } 
        else {
            // Handle non-API-related errors (network issues, coding mistakes, etc.)
            console.error("An unexpected error occurred during SendAIRequest: ", error);
            const aiResponse: AIResponse = AIResponseBuilder("", -1)
            return aiResponse;
        }
    }
}
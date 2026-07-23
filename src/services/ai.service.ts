import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Using Hugging Face Inference API (free with reasonable limits)
const HUGGING_FACE_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN || "";

interface AIResponse {
  generated_text: string;
}

export class AIService {
  private context: Map<string, string[]> = new Map();

  async generateResponse(phone: string, userMessage: string): Promise<string> {
    try {
      // If no token, use simple predefined responses
      if (!HUGGING_FACE_TOKEN) {
        return this.getFallbackResponse(userMessage);
      }

      // Get previous context
      if (!this.context.has(phone)) {
        this.context.set(phone, []);
      }
      const conversation = this.context.get(phone)!;

      // Prepare message for API
      conversation.push(userMessage);

      // Call Hugging Face API
      const response = await axios.post(
        HUGGING_FACE_API_URL,
        {
          inputs: {
            past_user_inputs: conversation.slice(-5), // Last 5 messages
            generated_responses: conversation.slice(-5),
            text: userMessage,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      const aiResponse = response.data as AIResponse;
      let botMessage = aiResponse.generated_text || "";

      // Clean response
      botMessage = botMessage.trim();

      if (!botMessage || botMessage.length < 3) {
        return this.getFallbackResponse(userMessage);
      }

      // Save to context
      conversation.push(botMessage);
      
      // Limit context to 20 messages
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20);
      }

      return botMessage;
    } catch (error: any) {
      console.error("Error in AI service:", error.message);
      return this.getFallbackResponse(userMessage);
    }
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return "Hello! Welcome to our software development service. How can I help you today?";
    }

    if (lowerMessage.includes("menu") || lowerMessage.includes("options") || lowerMessage.includes("catalog")) {
      return "I can help you with our services menu. Please type *MENU* to see all available options.";
    }

    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("how much")) {
      return "Our prices vary depending on the service. You can see the full catalog by typing *CATALOG* or ask about specific prices.";
    }

    if (lowerMessage.includes("thanks") || lowerMessage.includes("thank you") || lowerMessage.includes("gracias")) {
      return "You're welcome! I'm here to help. If you need anything else, feel free to ask.";
    }

    return "I understand your question. To help you better, type *MENU* to see our options or *HELP* for more information.";
  }

  clearContext(phone: string): void {
    this.context.delete(phone);
  }

  setContext(phone: string, context: string[]): void {
    this.context.set(phone, context);
  }
}

export const aiService = new AIService();


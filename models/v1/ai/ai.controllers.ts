

import { Request, Response } from "express";
import { GoogleGenAI } from '@google/genai';

export const generateAIResponse = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.params;

    if (!prompt) {
       res.status(400).json({
        success: false,
        message: "Prompt (text from voice) is required",
      });
      return
    }

    const ai = new GoogleGenAI({
      apiKey: 'AIzaSyB1SguuevA0o2iR3RVdOjJg8iCMyCqZmTk ',
    });

    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      responseMimeType: 'text/plain',
    };

    const model = "gemini-2.5-flash";

    const enhancedPrompt = `
      You are an aviation assistant for pilots.
      User's Question: ${prompt}
    `;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let aiResponse = '';
    for await (const chunk of response) {
      aiResponse += chunk.text;
    }

 

    res.status(200).json({
      success: true,
      message: "AI response generated successfully",
      data: aiResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

import 'dotenv/config';
import OpenAI from "openai";
import { memmory , addToMemmory , getMemmory , clearmemmory , summaryMemmory} from "./memmory.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


const system = `You are a coding agent. You receive information about a research paper (title, abstract, and other metadata) and your job is to write a minimal, runnable Python implementation of the core method described.

Rules:
- Read the abstract carefully and identify the core algorithm or method
- Write clean, minimal code that implements that method — not a full research-grade implementation, just enough to demonstrate the idea working
- If the abstract is too vague or missing implementation details, make a reasonable simplifying assumption and clearly comment where you did so
- Include a small runnable example at the bottom showing the code executing
- Do not just summarize the paper in comments — actually implement the method
- Keep the code short enough to read in under a minute`;


export async function writethecode(input) {

    if (memmory.length >= 10) {
        await summaryMemmory()
    }

    const inputStr = JSON.stringify(input);
    addToMemmory({role : 'user' , content : inputStr})
    const response = await openai.chat.completions.create({
          model: "gpt-5-nano-2025-08-07",
      
          messages: [
            { role: "system", content: `${system} previous messages: ${getMemmory().map(m => `${m.role}: ${m.content}`).join('\n')}` },
            { role: "user", content: inputStr  },
          ]       
        })
        const result = response.choices[0].message.content;
        addToMemmory({role : 'assistant' , content : result})
        return result
} 
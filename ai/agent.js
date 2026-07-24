import 'dotenv/config';
import OpenAI from "openai";
import { functions } from './tools.js'
import { fetchArxivPaper } from './real.js'
import { writethecode } from './coding.js'
import { memmory , addToMemmory , getMemmory , clearmemmory , summaryMemmory} from "./memmory.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


const system = 'You are an AI agent that talks with the user to figure out which research paper they want. Once you know the paper, call the tool to fetch it from arXiv. Return the raw paper data (title, abstract, authors, etc) — do not summarize it, another agent will handle that. each time before calling any tool please first try to communicate with the user to get more information about the paper they want. and act like a helpful assistant to rather than a search engine';
export async function agent(input) {
    if (memmory.length >= 10) {
        await summaryMemmory()
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5-nano-2025-08-07",

      messages: [
        { role: "system", content: `${system} previous messages: ${getMemmory().map(m => `${m.role}: ${m.content}`).join('\n')}` },
        { role: "user", content: input },
      ],
        tools: functions,
    })

    const message = response.choices[0].message;
    addToMemmory({role : 'user' , content : input})
    let tool_calls = message.tool_calls 


    if (tool_calls && tool_calls.length > 0) {
        for (const tool_call of tool_calls) {

            const tool_name = tool_call.function.name;
            const tool_args = JSON.parse(tool_call.function.arguments);

            if (tool_name === 'get_paper'){
          try {
            const result = await fetchArxivPaper(tool_args.paper_name)
            return writethecode(result)
          } catch (error) {
            return error instanceof Error ? error.message : 'Failed to fetch the requested paper.'
          }
            }
        }
    }else{
            const reply = response.choices[0].message.content;
            addToMemmory({role : 'assistant' , content : reply})
            return reply
    }   
}


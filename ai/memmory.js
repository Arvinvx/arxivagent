import 'dotenv/config';
import OpenAI from "openai";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


export let memmory =  [] 

export function addToMemmory(input) {
    memmory.push(input)
}

export function getMemmory() {
    return memmory
}

export function clearmemmory() {
    memmory = []
}

export async function summaryMemmory() {
    const newmemmory = JSON.stringify(memmory)
    let summary = "Summary of the conversation so far:\n";
    const response = await openai.chat.completions.create({
        model: "gpt-5-nano-2025-08-07",
        messages: [
            { role: "system", content: "you are an ai assistant that controls the memmory " },
            { role: "user", content: `Please summarize the following conversation:\n${newmemmory}` }
        ]
    });
     
    const result = response.choices[0].message.content;

    clearmemmory()
    addToMemmory({role : 'system' , content : `summary of the conversation so far: ${result}`})
}
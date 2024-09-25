import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import util from "util";

const unlinkFile = util.promisify(fs.unlink);

// Multer setup to handle file uploads
const upload = multer({ dest: "uploads/" });
const uploadMiddleware = upload.single("file");

// Init OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPEN_AI_KEY,
});

// Middleware to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req, res) {
  console.log("X FILE", req.body);

  const formData = await req.body.formData(); // process file as FormData
  const file = formData.get("file"); // retrieve the single file from FormData
  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

  // upload using the file stream
  const openaiFile = await openai.files.create({
    file: file,
    purpose: "assistants",
  });

  // add file to vector store
  await openai.beta.vectorStores.files.create(vectorStoreId, {
    file_id: openaiFile.id,
  });

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a knowledgeable assistant.",
      },
      {
        role: "user",
        content: `Use the following file content as your base knowledge:\n\n${openaiFile}`,
      },
    ],
  });

  console.log("XXXXXXXX", response);
  return res
    .status(200)
    .json({ response: response.data.choices[0].message.content });
}

export function GET(req, res) {
  return new Response(
    JSON.stringify({
      message: "test",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

const getOrCreateVectorStore = async () => {
  const assistant = await openai.beta.assistants.retrieve(
    process.env.NEXT_PUBLIC_OPEN_AI_ASSISTANT_ID
  );

  // if the assistant already has a vector store, return it
  if (assistant.tool_resources?.file_search?.vector_store_ids?.length > 0) {
    return assistant.tool_resources.file_search.vector_store_ids[0];
  }
  // otherwise, create a new vector store and attatch it to the assistant
  const vectorStore = await openai.beta.vectorStores.create({
    name: "reliability-assistant-vector-store",
  });
  await openai.beta.assistants.update(
    process.env.NEXT_PUBLIC_OPEN_AI_ASSISTANT_ID,
    {
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    }
  );
  return vectorStore.id;
};

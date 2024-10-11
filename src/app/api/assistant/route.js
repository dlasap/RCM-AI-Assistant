import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import util from "util";

import nextConnect from "next-connect";
import { NextResponse } from "next/server";
import { each } from "bluebird";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

const unlinkFile = util.promisify(fs.unlink);

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve("./uploads");
    console.log(
      "%c  uploadPath:",
      "color: #0e93e0;background: #aaefe5;",
      uploadPath
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Create the folder if it doesn't exist
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    console.log("%c  xxfile:", "color: #0e93e0;background: #aaefe5;", file);
    cb(null, `${Date.now()}-${file.originalname}`); // Append timestamp to avoid filename conflicts
  },
});

// Middleware to handle file uploads
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

// Init OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPEN_AI_KEY,
});

// Set up a handler with nextConnect to integrate multer with Next.js

export async function POST(request) {
  try {
    const res = NextResponse;
    const formData = await request.formData();
    const file = formData.get("file");
    const prompt = formData.get("prompt");

    upload.single("file")(request, res, async function (err) {
      if (err) {
        console.error("Multer error:", err);
        return res.status(500).json({ error: "File upload failed" });
      }
    });
    // Access uploaded file via req.file
    console.log("Uploaded file:", request.file, {
      file: request.file,
      res,
      request,
    });

    const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

    // upload using the file stream
    const openaiFile = await openai.files.create({
      file: file,
      purpose: "assistants",
    });

    // add file to vector store
    const vectorFile = await openai.beta.vectorStores.files.create(
      vectorStoreId,
      {
        file_id: openaiFile.id,
      }
    );

    console.log("VFILE", vectorFile);
    // List all vector files on vectore store
    const fileLists = await openai.beta.vectorStores.files.list(vectorStoreId);
    const x = await openai.beta.vectorStores.list();
    console.log("FILE LIST", {
      // data: fileLists.data,
      x: x.data,
      vectorStoreId,
    });

    // Create thread
    const thread = await openai.beta.threads.create();

    const assistant = await openai.beta.assistants.retrieve(
      process.env.NEXT_PUBLIC_OPEN_AI_ASSISTANT_ID
    );

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });

    let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      instructions: `Please address the user as a professional RCM user. The user has a premium account and wants to know more about the most recent file uploaded if ever. Also remove unnecessary or "source" strings on the response.
      Base the response from the most recent file uploaded - ${vectorFile.id}`,
      response_format: {
        type: "text",
      },
      temperature: 0.15,
    });

    let resultResponse = "";

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      console.log(
        "%c  TEST messages:",
        "color: #0e93e0;background: #aaefe5;",
        messages
      );
      for (const message of messages.data.reverse()) {
        if (message.role === "assistant")
          resultResponse = message.content[0].text.value;
        console.log(`${message.role} > ${message.content[0].text.value}`);
      }
    } else {
      console.log(run.status);
    }

    // Asynchronous deletion of file on vector store
    deleteVectorFiles([vectorFile], vectorStoreId);

    // Send response
    return res.json({
      message: "File uploaded successfully",
      file: request.file,
      response: resultResponse,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
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

// USE TO DELETE Vector Files
const deleteVectorFiles = async (dataArray, vectorStoreId) => {
  each(dataArray, async (item, index) => {
    const res = await openai.beta.vectorStores.files.del(
      vectorStoreId,
      item.id
    );
    console.log(`RESSSS File ${index + 1}`, res);
  });
};

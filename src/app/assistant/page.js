"use client";

import { LinearProgress } from "@mui/joy";
import { useState } from "react";

import React from "react";
import ReactMarkdown from "react-markdown";

function cleanResponse(response) {
  return response
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width characters
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
    .replace(/source\d+:\d+source/g, "") // Remove unwanted 'source' strings
    .replace(/【\d+:\d+†[a-zA-Z]+】/g, "")
    .trim(); // Trim any leading or trailing whitespace
}

export default function Assistant() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("prompt", prompt);

    try {
      setIsLoading(true);
      const uploadRes = await fetch("/api/assistant", {
        method: "POST",
        body: formData,
      });
      const data = await uploadRes.json();
      if (data.response) {
        setResponse(data.response);
      } else {
        setResponse("Error processing file.");
      }
    } catch (err) {
      console.error(err);
      setResponse("Error communicating with the assistant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-blue-700 flex flex-col  min-h-full pb-2">
      <div className="w-full bg-orange-400 flex justify-center items-center h-[70px]">
        <h1 className="text-center text-2xl font-bold text-white">RCM Bot Assistant</h1>
      </div>

      <div className="flex justify-center m-4">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="file" className="font-semibold bg-orange-400 w-fit px-1  border-blue-200 border border-solid">
              Upload a File
            </label>
            <div className="flex gap-4    ">
              <input type="file" id="file" onChange={handleFileChange} />
              {file && <div className="font-semibold">File size: {(file.size / (1024 * 1024)).toFixed(2)} MB</div>}
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-5">
            <label htmlFor="prompt" className="font-semibold bg-orange-400 w-fit px-1  border-blue-200 border border-solid">
              Your Prompt
            </label>
            <textarea
              disabled={isLoading}
              className="text-blue-400 min-h-8 p-2 rounded-lg w-[500px] border-[3px] border-solid border-orange-400 font-medium text-lg"
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
            <button disabled={!file | isLoading} className="rounded-2xl bg-orange-500 px-2 py-[2px]" type="submit">
              Submit
            </button>

            {isLoading && (
              <div className="mt-10">
                <h5 className="font-semibold text-3xl text-center mb-4">AI is generating...</h5>
                <LinearProgress color="warning" determinate={false} size="lg" variant="solid" />
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="flex justify-center text-blue-500 ">
        {response && !isLoading && (
          <div className="bg-white px-4 py-2 rounded-xl max-w-[700px] border-[3px] border-solid border-orange-400 ">
            <h2 className="font-semibold bg-orange-400 w-fit px-1  border-blue-200 border border-solid text-white mb-2">RCM BOT Response</h2>
            <ReactMarkdown>{cleanResponse(`${response}`)}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

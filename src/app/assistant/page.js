"use client";

import { useState } from "react";

export default function Assistant() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  console.log("XXXPROMPT", { file, prompt });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    try {
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
    }
  };

  return (
    <div>
      <h1>LLM Assistant</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file">Upload a File</label>
          <input type="file" id="file" onChange={handleFileChange} />
        </div>
        <div>
          <label htmlFor="prompt">Your Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          ></textarea>
        </div>
        <button type="submit">Submit</button>
      </form>
      {response && (
        <div>
          <h2>Assistant Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

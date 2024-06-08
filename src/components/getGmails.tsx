"use client";
import React, { useState } from "react";

export function GetGmails() {
  const [emails, setEmails] = useState([]);

  const handleClick = async () => {
    try {
      const response = await fetch("/api/gmail");
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(data);
      setEmails(data);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  return (
    <>
      <button onClick={handleClick}>Get mails (10)</button>
      <ul>
        {emails.map((email, i) => (
          <li key={i}>
            <strong>{email.snippet}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

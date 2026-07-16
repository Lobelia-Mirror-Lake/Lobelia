import { API_URL } from "../config"

export async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!res.ok) {
      return "Invalid credentials.";
    }

    const data = await res.json();
    return data.access_token; // JWT
  }
  catch (err) {
    return "Trouble Processing. Please try again later.";
  }
}

export async function signUp(email, password) {
  try {
    const res = await fetch(`${API_URL}/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!res.ok) {
      if(res.status == 409) {
        return "Email already exists.";
      }
      else {
        return "Invalid credentials.";
      }
    }

    const data = await res.json();

    return data.access_token; // JWT
  }
  catch (err) {
    return "Trouble Processing. Please try again later.";
  }
}

export function isJwt(token) {
  if (typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, payload, signature] = parts;

  // Basic base64url check
  const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
  if (!base64urlRegex.test(header)) return false;
  if (!base64urlRegex.test(payload)) return false;
  if (!base64urlRegex.test(signature)) return false;

  try {
    // Convert base64url → base64
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");

    // Decode
    const decoded = atob(normalizedPayload);

    // Payload must be valid JSON
    JSON.parse(decoded);

    return true;
  } catch {
    return false;
  }
}

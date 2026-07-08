export async function login(email, password) {
  const res = await fetch("http://127.0.0.1/v1/auth/login", {
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

export async function signUp(email, password) {
  const res = await fetch("http://127.0.0.1/v1/auth/register", {
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

export function isJwt(token) {
  return typeof token === "string" && token.split(".").length === 3;
}

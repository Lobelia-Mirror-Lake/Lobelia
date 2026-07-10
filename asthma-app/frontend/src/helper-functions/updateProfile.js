const API = "http://127.0.0.1:8000";

export async function updateProfile(data, token) {
    const response = await fetch(`${API}/v1/users/me`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error("Unable to save profile.");
    }

    return response.json();
}
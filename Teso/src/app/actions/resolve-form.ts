"use server";

export async function resolveGoogleFormUrl(): Promise<string> {
  try {
    const response = await fetch("https://forms.gle/rGEYGQWWpZSU2M6o6", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const finalUrl = response.url;
    if (finalUrl) {
      const url = new URL(finalUrl);
      url.searchParams.set("embedded", "true");
      return url.toString();
    }
    return "https://forms.gle/rGEYGQWWpZSU2M6o6";
  } catch (error) {
    console.error("Failed to resolve google form redirect:", error);
    return "https://forms.gle/rGEYGQWWpZSU2M6o6";
  }
}

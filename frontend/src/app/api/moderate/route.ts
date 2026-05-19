import { NextRequest, NextResponse } from "next/server";

// Define the expected request body type
interface ModerationRequestBody {
  comment: string;
  product_title: string;
}

// Define the response type from the backend
interface ModerationResponse {
  decision: "approved" | "rejected" | "pending";
  reason?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the incoming request body from the frontend component
    const body = (await req.json()) as ModerationRequestBody;

    // 2. Validate that the AI Agent URL is defined in environment variables (Match your .env key)
    const aiAgentUrl = process.env.AI_AGENT_URL;
    
    if (!aiAgentUrl) {
      console.error("Configuration Error: AI_AGENT_URL is not defined in environment variables.");
      return NextResponse.json(
        { decision: "error", reason: "Backend configuration missing" },
        { status: 500 }
      );
    }

    // 3. Forward the request to your Rust AI Agent moderation endpoint
    // Note: Removed '/api' prefix to match your Rust route: POST /moderate
    const response = await fetch(`${aiAgentUrl}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // 4. Check if the AI Agent responded with an error (e.g., 500 or 404)
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Agent Moderation Error:", errorText);
      return NextResponse.json(
        { decision: "error", reason: "Failed to communicate with moderation service" },
        { status: response.status }
      );
    }

    // 5. Parse the successful response from the AI Agent and return it to the frontend
    const data = (await response.json()) as ModerationResponse;
    return NextResponse.json(data);

  } catch (error) {
    // 6. Catch any unexpected crashes (network issues, JSON parsing errors, etc.)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Moderation Proxy Route Exception:", errorMessage);
    return NextResponse.json(
      { decision: "error", reason: "Internal server error in moderation proxy" },
      { status: 500 }
    );
  }
}
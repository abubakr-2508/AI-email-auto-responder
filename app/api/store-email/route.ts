// app/api/store-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Define the types for your email and sections
interface Email {
  subject: string;
  sender: string;
  recipient: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
}

interface EmailSection {
  email_id: number;
  section_content: string;
  embedding: number[];
  section_order: number;
}

// Initialize Supabase Client
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

// Define the schema for the Email object
const emailSchema = z.object({
  subject: z.string(),
  sender: z.string().email(),
  recipient: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  body: z.string(),
});

// Function to split the email body into chunks
function splitIntoChunks(text: string, chunkSize: number = 2000): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    if (currentChunk.length + word.length + 1 > chunkSize) {
      chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk += (currentChunk ? " " : "") + word;
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}

// POST handler
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log("Received a POST request");

    const requestData = await request.json();
    console.log("Request data parsed:", requestData);

    // Validate the request data using zod
    const validationResult = emailSchema.safeParse(requestData);
    console.log("Validation result:", validationResult);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { error: "Invalid email data", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { subject, sender, recipient, cc, bcc, body }: Email =
      validationResult.data;
    console.log("Email data validated and extracted");

    // Step 1: Store the root email in the database
    console.log("Attempting to insert email into database...");
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert([{ subject, sender, recipient, cc, bcc, body }])
      .select("id")
      .single();
    
    if (emailError) {
      console.error("Error inserting email:", emailError);
      throw new Error(`Email insertion failed: ${emailError.message}. Details: ${JSON.stringify(emailError)}`);
    }
    
    console.log("Email inserted successfully:", email);

    const emailId: number = email.id;
    console.log("Email ID:", emailId);

    // Step 2: Split the email body into smaller chunks
    const chunks = splitIntoChunks(body);
    console.log("Email body split into chunks:", chunks);

    // Step 3: Embed each chunk and store it in the database
    // Initialize Gemini Client
    console.log("Initializing Gemini client...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    console.log("Gemini client initialized successfully");
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}:`, chunk.substring(0, 100) + '...');

      try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        console.log("Gemini model created, generating embedding...");
        const embeddingResponse = await model.embedContent(chunk);
        console.log("Embedding response received successfully");

        const embedding = embeddingResponse.embedding.values;
        console.log("Embedding extracted, length:", embedding?.length);

        const section: EmailSection = {
          email_id: emailId,
          section_content: chunk,
          embedding,
          section_order: i + 1,
        };

        console.log("Inserting section into database...");
        const { error: sectionError } = await supabase
          .from("email_sections")
          .insert([section]);
        
        if (sectionError) {
          console.error("Error inserting section:", sectionError);
          throw new Error(`Section insertion error: ${sectionError.message}`);
        }
        
        console.log("Section inserted successfully");
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        throw new Error(`Chunk processing error: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
      }
    }

    console.log("Email stored successfully!");
    return NextResponse.json(
      { message: "Email stored successfully!" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error storing email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to store email" },
      { status: 500 }
    );
  }
}
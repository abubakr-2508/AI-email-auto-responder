// app/api/ask-question/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { question } = await request.json();

    // Step 1: Convert the question into an embedding
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embeddingResponse = await model.embedContent(question);

    const questionEmbedding = embeddingResponse.embedding.values;

    // Step 2: Search the vector store for relevant emails using similarity search
    console.log("Starting vector search with embedding dimensions:", questionEmbedding?.length);
    console.log("Search parameters: threshold=0.0, count=10");
    console.log("Question:", question);
    
    const { data: matchingSections, error } = await supabase.rpc(
      "match_filtered_email_sections",
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.0, // Lower threshold to find more matches
        match_count: 10, // Number of relevant emails to retrieve
      }
    );

    console.log("Vector search completed. Found sections:", matchingSections?.length || 0);
    console.log("Vector search error:", error);
    console.log("All matching sections:", matchingSections?.map(s => ({
      id: s.id,
      similarity: s.similarity,
      content: s.section_content?.substring(0, 100) + '...'
    })));

    if (error) throw new Error(error.message);

    // Get email metadata for the matching sections
    if (matchingSections && matchingSections.length > 0) {
      const emailIds = [...new Set(matchingSections.map((s: any) => s.email_id))];
      const { data: emailMetadata, error: metadataError } = await supabase
        .from("emails")
        .select("id, subject, sender, recipient")
        .in("id", emailIds);
      
      console.log("Email metadata:", emailMetadata);
      
      // Enhance sections with email metadata
      matchingSections.forEach((section: any) => {
        const emailData = emailMetadata?.find(e => e.id === section.email_id);
        if (emailData) {
          section.email_metadata = emailData;
        }
      });
    }

    // Combine the relevant sections into a single context
    // Sort by similarity and take only the most relevant ones
    const sortedSections = matchingSections
      .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 5); // Take top 5 most relevant sections
    
    // Function to extract core name from email address
    const extractNameFromEmail = (email: string): string => {
      if (!email) return '';
      const localPart = email.split('@')[0];
      // Remove numbers and dots, take the first part
      const coreName = localPart.split('.')[0].replace(/\d+/g, '');
      return coreName;
    };

    const context = sortedSections
      .map((section: any, index: number) => {
        const metadata = section.email_metadata;
        if (metadata) {
          const senderEmail = metadata.sender || '';
          const senderName = extractNameFromEmail(senderEmail);
          const senderInfo = senderEmail ? `\n📧 SENDER: ${senderEmail}${senderName ? ` (${senderName})` : ''}` : '';
          
          const recipientEmail = Array.isArray(metadata.recipient) ? metadata.recipient.join(', ') : (metadata.recipient || '');
          const recipientInfo = recipientEmail ? `\n📬 TO: ${recipientEmail}` : '';
          
          const subjectInfo = metadata.subject ? `\n📝 SUBJECT: ${metadata.subject}` : '';
          return `EMAIL ${index + 1}:${senderInfo}${recipientInfo}${subjectInfo}\n\n💬 CONTENT: ${section.section_content}`;
        } else {
          return `EMAIL ${index + 1}:\n💬 CONTENT: ${section.section_content}`;
        }
      })
      .join("\n\n" + "=".repeat(50) + "\n\n");

    console.log("Selected sections for context:", sortedSections?.map(s => ({
      similarity: s.similarity,
      email_info: s.email_metadata ? `From: ${s.email_metadata.sender}, Subject: ${s.email_metadata.subject}` : 'No metadata',
      content: s.section_content?.substring(0, 50) + '...'
    })));
    console.log("Final context:", context);

    // Step 3: Use Gemini to generate a response using the relevant email content as context
    const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are an AI assistant helping to answer questions based on email content. Use the provided context to answer the question as accurately as possible.

Context from emails:
${context}

Question: ${question}

Instructions:
- IMPORTANT: When matching names, be flexible with email addresses that contain the person's name
- If someone asks about "abubakr", match it with email addresses like "abubakr.texspira@gmail.com" or "abubakr.mohammed2508@gmail.com"
- If someone asks about "abuzar", match it with "abuzar18@gmail.com"
- If someone asks about "umar", match it with "umar11@gmail.com"
- Extract the core name from email addresses (before @ symbol and before any dots/numbers)
- Connect names from email metadata (sender, recipient, subject) with preferences mentioned in the email content
- If someone sends an email mentioning location preferences, associate those preferences with the sender
- If an email is about someone's preferences, connect the person mentioned in the subject/recipient with the content
- Look for patterns like "[Name] wants to live in [Location]" in the content AND connect it with names from metadata
- Make logical connections: if John sends an email saying "I want to live in Mumbai", then John wants to live in Mumbai
- If an email from person A mentions "person B wants to live in location C", connect person B with location C
- Be helpful and make reasonable connections between people mentioned anywhere in the email and their stated preferences
- If you can find relevant information by matching names with email addresses, provide a direct answer
- Only say you don't know if there's truly no relevant information after checking both metadata and content with flexible name matching

Answer:`;
    
    const aiResponse = await chatModel.generateContent(prompt);
    const answer = aiResponse.response.text();

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error: any) {
    console.error("Error in ask-question API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
// Test endpoint to check database setup
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

export async function GET(): Promise<NextResponse> {
  try {
    console.log("Testing database connectivity...");
    
    // Test 1: Check if we can connect to Supabase
    console.log("Checking Supabase connection...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("emails")
      .select("count", { count: "exact", head: true });
    
    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: connectionError,
        tables: null
      }, { status: 500 });
    }
    
    console.log("Connection successful");
    
    // Test 2: Check table structure
    console.log("Checking table structures...");
    const { data: emailsTest, error: emailsError } = await supabase
      .from("emails")
      .select("*")
      .limit(1);
      
    const { data: sectionsTest, error: sectionsError } = await supabase
      .from("email_sections") 
      .select("*")
      .limit(1);
    
    return NextResponse.json({
      success: true,
      message: "Database connectivity test completed",
      results: {
        connection: "✓ Connected",
        emailsTable: emailsError ? `✗ Error: ${emailsError.message}` : "✓ Accessible",
        sectionsTable: sectionsError ? `✗ Error: ${sectionsError.message}` : "✓ Accessible",
        emailsCount: connectionTest,
        sampleEmails: emailsTest,
        sampleSections: sectionsTest
      },
      errors: {
        emailsError,
        sectionsError
      }
    });
    
  } catch (error: any) {
    console.error("Database test failed:", error);
    return NextResponse.json({
      success: false,
      error: "Database test failed",
      details: error.message
    }, { status: 500 });
  }
}
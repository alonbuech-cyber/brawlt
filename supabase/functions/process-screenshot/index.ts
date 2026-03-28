import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { submission_id, image_path, tournament_id } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("screenshots")
      .download(image_path);

    if (downloadError || !imageData) {
      return new Response(
        JSON.stringify({ error: "Failed to download image" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mediaType = image_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // Call Claude API for OCR
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20241022",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: 'This is a Brawl Stars screenshot. Extract: 1) the brawler name, 2) the trophy count shown for that brawler. Return JSON only, no other text: {"brawler_name": string, "trophy_count": number, "confidence": "high"|"low"}. If you cannot read either value clearly, set confidence to "low". If you cannot read the trophy count at all, set trophy_count to null.',
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", errText);
      await supabase
        .from("submissions")
        .update({ ocr_status: "ocr_failed" })
        .eq("id", submission_id);

      return new Response(
        JSON.stringify({ error: "OCR failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();
    const textContent = claudeData.content?.find(
      (c: any) => c.type === "text"
    )?.text;

    let ocrResult: {
      brawler_name: string | null;
      trophy_count: number | null;
      confidence: "high" | "low";
    };

    try {
      // Try to parse JSON from response, handling potential markdown wrapping
      let jsonStr = textContent || "{}";
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      ocrResult = JSON.parse(jsonStr);
    } catch {
      ocrResult = { brawler_name: null, trophy_count: null, confidence: "low" };
    }

    // Determine OCR status
    let ocrStatus: string;
    let resubmitAllowedUntil: string | null = null;

    if (ocrResult.confidence === "high" && ocrResult.trophy_count !== null) {
      ocrStatus = "approved";
    } else if (ocrResult.trophy_count !== null) {
      ocrStatus = "pending"; // Goes to admin review
    } else {
      ocrStatus = "ocr_failed";
      // Calculate next deadline for resubmit window
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("daily_deadline_hour")
        .eq("id", tournament_id)
        .single();

      if (tournament) {
        const now = new Date();
        const deadline = new Date(now);
        deadline.setUTCHours(tournament.daily_deadline_hour, 0, 0, 0);
        if (deadline.getTime() <= now.getTime()) {
          deadline.setDate(deadline.getDate() + 1);
        }
        resubmitAllowedUntil = deadline.toISOString();
      }
    }

    // Update submission
    const updatePayload: Record<string, any> = {
      trophy_count: ocrResult.trophy_count,
      brawler_detected: ocrResult.brawler_name,
      ocr_status: ocrStatus,
      ocr_confidence: ocrResult.confidence,
    };
    if (resubmitAllowedUntil) {
      updatePayload.resubmit_allowed_until = resubmitAllowedUntil;
    }
    if (ocrStatus === "approved") {
      updatePayload.reviewed_at = new Date().toISOString();
    }

    await supabase
      .from("submissions")
      .update(updatePayload)
      .eq("id", submission_id);

    // Day 1 validation for approved submissions
    if (ocrStatus === "approved") {
      const { data: submission } = await supabase
        .from("submissions")
        .select("*, participants(*)")
        .eq("id", submission_id)
        .single();

      if (submission && submission.day_number === 1) {
        // Get tournament for validation
        const { data: tournament } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournament_id)
          .single();

        if (tournament) {
          let validationError: string | null = null;

          // Validate brawler lock
          if (
            tournament.brawler_lock &&
            ocrResult.brawler_name &&
            ocrResult.brawler_name.toLowerCase() !==
              tournament.brawler_lock.toLowerCase()
          ) {
            validationError = `Brawler must be ${tournament.brawler_lock}, detected ${ocrResult.brawler_name}`;
          }

          // Validate trophy range
          if (
            !validationError &&
            ocrResult.trophy_count !== null
          ) {
            if (ocrResult.trophy_count < tournament.trophy_min) {
              validationError = `Trophy count ${ocrResult.trophy_count} is below minimum ${tournament.trophy_min}`;
            }
            if (
              tournament.trophy_max !== null &&
              ocrResult.trophy_count > tournament.trophy_max
            ) {
              validationError = `Trophy count ${ocrResult.trophy_count} exceeds maximum ${tournament.trophy_max}`;
            }
          }

          if (validationError) {
            // Reject with reason
            await supabase
              .from("submissions")
              .update({
                ocr_status: "rejected",
                rejection_reason: validationError,
              })
              .eq("id", submission_id);
          } else if (
            ocrResult.trophy_count !== null &&
            submission.participants?.baseline_trophies === null
          ) {
            // Set baseline trophies
            await supabase
              .from("participants")
              .update({ baseline_trophies: ocrResult.trophy_count })
              .eq("id", submission.participant_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ocr_status: ocrStatus,
        brawler_name: ocrResult.brawler_name,
        trophy_count: ocrResult.trophy_count,
        confidence: ocrResult.confidence,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

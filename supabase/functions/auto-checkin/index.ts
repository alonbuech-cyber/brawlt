import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BRAWLSTARS_API_KEY = Deno.env.get("BRAWLSTARS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results: { participant: string; status: string }[] = [];

    // Find all active tournaments
    const { data: tournaments } = await supabase
      .from("tournaments")
      .select("*")
      .lte("starts_at", now.toISOString());

    if (!tournaments) {
      return new Response(JSON.stringify({ success: true, message: "No tournaments", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const tournament of tournaments) {
      const start = new Date(tournament.starts_at);
      const end = new Date(start.getTime() + tournament.duration_days * 86400000);
      if (now > end) continue; // Tournament ended

      // Calculate current day
      const currentDay = Math.min(
        Math.floor((now.getTime() - start.getTime()) / 86400000) + 1,
        tournament.duration_days
      );
      if (currentDay < 2) continue; // Day 1 must be manual

      // Calculate today's deadline
      const deadlineToday = new Date(now);
      deadlineToday.setUTCHours(tournament.daily_deadline_hour, 0, 0, 0);
      // If deadline already passed today, skip
      if (now > deadlineToday) continue;

      // Only auto-checkin if deadline is within the next 10 minutes
      const minutesUntilDeadline = (deadlineToday.getTime() - now.getTime()) / 60000;
      if (minutesUntilDeadline > 10 || minutesUntilDeadline < 0) continue;

      console.log(`Auto-checkin for ${tournament.name}, Day ${currentDay}, ${minutesUntilDeadline.toFixed(1)} min until deadline`);

      // Find participants who haven't submitted today
      const { data: participants } = await supabase
        .from("participants")
        .select("id, brawler_name, baseline_trophies, profile_id, profiles(player_tag)")
        .eq("tournament_id", tournament.id)
        .eq("is_eliminated", false)
        .eq("disqualified", false);

      if (!participants) continue;

      for (const participant of participants) {
        const playerTag = (participant as any).profiles?.player_tag;
        if (!playerTag) {
          results.push({ participant: participant.id, status: "skipped: no player_tag" });
          continue;
        }

        // Check if already submitted today
        const { data: existing } = await supabase
          .from("submissions")
          .select("id")
          .eq("participant_id", participant.id)
          .eq("day_number", currentDay)
          .single();

        if (existing) {
          results.push({ participant: participant.id, status: "already checked in" });
          continue;
        }

        // Fetch trophies from Brawl Stars API
        try {
          const cleanTag = playerTag.startsWith("#") ? playerTag : `#${playerTag}`;
          const encodedTag = encodeURIComponent(cleanTag);
          const bsResponse = await fetch(
            `https://bsproxy.royaleapi.dev/v1/players/${encodedTag}`,
            { headers: { Authorization: `Bearer ${BRAWLSTARS_API_KEY}` } }
          );

          if (!bsResponse.ok) {
            results.push({ participant: participant.id, status: `api error: ${bsResponse.status}` });
            continue;
          }

          const playerData = await bsResponse.json();
          const brawler = playerData.brawlers?.find(
            (b: { name: string }) => b.name.toLowerCase() === participant.brawler_name.toLowerCase()
          );

          if (!brawler) {
            results.push({ participant: participant.id, status: `brawler not found: ${participant.brawler_name}` });
            continue;
          }

          // Create submission
          const { error: subError } = await supabase
            .from("submissions")
            .upsert(
              {
                participant_id: participant.id,
                tournament_id: tournament.id,
                day_number: currentDay,
                image_url: null,
                trophy_count: brawler.trophies,
                brawler_detected: brawler.name,
                ocr_status: "approved",
                ocr_confidence: "high",
                submitted_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
              },
              { onConflict: "participant_id,day_number" }
            );

          if (subError) {
            results.push({ participant: participant.id, status: `db error: ${subError.message}` });
          } else {
            results.push({ participant: participant.id, status: "auto-checked-in" });
            console.log(`Auto-checked-in participant ${participant.id} for Day ${currentDay}: ${brawler.name} at ${brawler.trophies}`);
          }
        } catch (err) {
          results.push({ participant: participant.id, status: `error: ${err}` });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-checkin error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

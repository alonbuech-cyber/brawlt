import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BRAWLSTARS_API_KEY = Deno.env.get("BRAWLSTARS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BrawlerData {
  name: string;
  trophies: number;
}

interface BrawlStarsPlayer {
  tag: string;
  name: string;
  trophies: number;
  brawlers: BrawlerData[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { participant_id, tournament_id, day_number, player_tag, action } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch player data from Brawl Stars API
    const encodedTag = encodeURIComponent(player_tag);
    const bsResponse = await fetch(
      `https://api.brawlstars.com/v1/players/${encodedTag}`,
      { headers: { Authorization: `Bearer ${BRAWLSTARS_API_KEY}` } }
    );

    const bsText = await bsResponse.text();
    console.log("BS API status:", bsResponse.status, "body:", bsText);

    if (!bsResponse.ok) {
      return jsonResponse({ error: "Could not fetch player data", status: bsResponse.status, details: bsText }, 400);
    }

    let playerData: BrawlStarsPlayer;
    try {
      playerData = JSON.parse(bsText);
    } catch {
      return jsonResponse({ error: "Invalid response from Brawl Stars API", raw: bsText }, 500);
    }

    // ACTION: validate
    if (action === "validate") {
      return jsonResponse({
        success: true,
        player_name: playerData.name,
        total_trophies: playerData.trophies,
        brawlers: playerData.brawlers.map((b) => ({
          name: b.name,
          trophies: b.trophies,
        })),
      });
    }

    // ACTION: checkin
    if (action === "checkin") {
      const { data: participant } = await supabase
        .from("participants")
        .select("brawler_name, baseline_trophies")
        .eq("id", participant_id)
        .single();

      if (!participant) {
        return jsonResponse({ error: "Participant not found" }, 404);
      }

      const brawler = playerData.brawlers.find(
        (b) => b.name.toLowerCase() === participant.brawler_name.toLowerCase()
      );

      if (!brawler) {
        return jsonResponse({
          error: `Brawler "${participant.brawler_name}" not found on this account`,
        }, 400);
      }

      const { error: subError } = await supabase
        .from("submissions")
        .upsert(
          {
            participant_id,
            tournament_id,
            day_number,
            image_url: null,
            trophy_count: brawler.trophies,
            brawler_detected: brawler.name,
            ocr_status: "approved",
            ocr_confidence: "high",
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
          },
          { onConflict: "participant_id,day_number" }
        )
        .select()
        .single();

      if (subError) {
        return jsonResponse({ error: subError.message }, 500);
      }

      if (day_number === 1 && participant.baseline_trophies === null) {
        await supabase
          .from("participants")
          .update({ baseline_trophies: brawler.trophies })
          .eq("id", participant_id);
      }

      return jsonResponse({
        success: true,
        trophy_count: brawler.trophies,
        brawler_name: brawler.name,
        baseline_set: day_number === 1 && participant.baseline_trophies === null,
      });
    }

    // ACTION: join
    if (action === "join") {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournament_id)
        .single();

      if (!tournament) {
        return jsonResponse({ error: "Tournament not found" }, 404);
      }

      const brawlerName = tournament.brawler_lock || null;
      let targetBrawler: BrawlerData | undefined;

      if (brawlerName) {
        targetBrawler = playerData.brawlers.find(
          (b) => b.name.toLowerCase() === brawlerName.toLowerCase()
        );
        if (!targetBrawler) {
          return jsonResponse({
            error: `You don't have the brawler "${brawlerName}" on this account`,
          }, 400);
        }

        if (targetBrawler.trophies < tournament.trophy_min) {
          return jsonResponse({
            error: `${targetBrawler.name} has ${targetBrawler.trophies} trophies, minimum is ${tournament.trophy_min}`,
          }, 400);
        }
        if (tournament.trophy_max !== null && targetBrawler.trophies > tournament.trophy_max) {
          return jsonResponse({
            error: `${targetBrawler.name} has ${targetBrawler.trophies} trophies, maximum is ${tournament.trophy_max}`,
          }, 400);
        }
      }

      return jsonResponse({
        success: true,
        player_name: playerData.name,
        brawlers: playerData.brawlers.map((b) => ({
          name: b.name,
          trophies: b.trophies,
        })),
        validated_brawler: targetBrawler
          ? { name: targetBrawler.name, trophies: targetBrawler.trophies }
          : null,
      });
    }

    return jsonResponse({ error: "Invalid action. Use: validate, join, checkin" }, 400);
  } catch (error) {
    console.error("Edge function error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

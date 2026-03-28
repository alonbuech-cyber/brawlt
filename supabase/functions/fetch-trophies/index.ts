import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BRAWLSTARS_API_KEY = Deno.env.get("BRAWLSTARS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  try {
    const { participant_id, tournament_id, day_number, player_tag, action } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch player data from Brawl Stars API
    const encodedTag = encodeURIComponent(player_tag);
    const bsResponse = await fetch(
      `https://api.brawlstars.com/v1/players/${encodedTag}`,
      {
        headers: { Authorization: `Bearer ${BRAWLSTARS_API_KEY}` },
      }
    );

    if (!bsResponse.ok) {
      const errText = await bsResponse.text();
      return new Response(
        JSON.stringify({ error: "Could not fetch player data", details: errText }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const playerData: BrawlStarsPlayer = await bsResponse.json();

    // ACTION: validate — just validate tag and return player info
    if (action === "validate") {
      return new Response(
        JSON.stringify({
          success: true,
          player_name: playerData.name,
          total_trophies: playerData.trophies,
          brawlers: playerData.brawlers.map((b) => ({
            name: b.name,
            trophies: b.trophies,
          })),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ACTION: checkin — fetch trophies and create/update submission
    if (action === "checkin") {
      // Get participant's brawler name
      const { data: participant } = await supabase
        .from("participants")
        .select("brawler_name, baseline_trophies")
        .eq("id", participant_id)
        .single();

      if (!participant) {
        return new Response(
          JSON.stringify({ error: "Participant not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find the brawler in the API response
      const brawler = playerData.brawlers.find(
        (b) => b.name.toLowerCase() === participant.brawler_name.toLowerCase()
      );

      if (!brawler) {
        return new Response(
          JSON.stringify({
            error: `Brawler "${participant.brawler_name}" not found on this account`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Upsert submission
      const { data: submission, error: subError } = await supabase
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
        return new Response(
          JSON.stringify({ error: subError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Set baseline on Day 1
      if (day_number === 1 && participant.baseline_trophies === null) {
        await supabase
          .from("participants")
          .update({ baseline_trophies: brawler.trophies })
          .eq("id", participant_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          trophy_count: brawler.trophies,
          brawler_name: brawler.name,
          baseline_set: day_number === 1 && participant.baseline_trophies === null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ACTION: join — validate brawler + trophy range for tournament
    if (action === "join") {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournament_id)
        .single();

      if (!tournament) {
        return new Response(
          JSON.stringify({ error: "Tournament not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // If brawler_lock is set, check that player has it
      const brawlerName = tournament.brawler_lock || null;
      let targetBrawler: BrawlerData | undefined;

      if (brawlerName) {
        targetBrawler = playerData.brawlers.find(
          (b) => b.name.toLowerCase() === brawlerName.toLowerCase()
        );
        if (!targetBrawler) {
          return new Response(
            JSON.stringify({
              error: `You don't have the brawler "${brawlerName}" on this account`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Validate trophy range if brawler is locked
      if (targetBrawler) {
        if (targetBrawler.trophies < tournament.trophy_min) {
          return new Response(
            JSON.stringify({
              error: `${targetBrawler.name} has ${targetBrawler.trophies} trophies, minimum is ${tournament.trophy_min}`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        if (
          tournament.trophy_max !== null &&
          targetBrawler.trophies > tournament.trophy_max
        ) {
          return new Response(
            JSON.stringify({
              error: `${targetBrawler.name} has ${targetBrawler.trophies} trophies, maximum is ${tournament.trophy_max}`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          player_name: playerData.name,
          brawlers: playerData.brawlers.map((b) => ({
            name: b.name,
            trophies: b.trophies,
          })),
          validated_brawler: targetBrawler
            ? { name: targetBrawler.name, trophies: targetBrawler.trophies }
            : null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: validate, join, checkin" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function parseRoomMeta(roomName: string | null) {
  if (!roomName || !roomName.startsWith("{")) return {};
  try {
    return JSON.parse(roomName);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roomCode = String(body.roomCode || "").trim().toUpperCase();
    const accessCode = String(body.accessCode || "").trim();
    const guestName = String(body.guestName || "").trim();

    if (!roomCode) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { user } = await getAuthenticatedUser(req);

    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, name, room_code, created_by, is_active, created_at")
      .eq("room_code", roomCode)
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found. Check your code." }, { status: 404 });
    }

    if (room.is_active === false) {
      return NextResponse.json({ error: "This session has ended." }, { status: 403 });
    }

    const meta = parseRoomMeta(room.name);
    const roomType = meta.roomType || (room as any).room_type || "coding";

    // Enforce 45-minute duration limit for free study rooms
    if (roomType === "study" && room.created_at) {
      const elapsedMs = Date.now() - new Date(room.created_at).getTime();
      if (elapsedMs > 45 * 60 * 1000) {
        await supabaseAdmin.from("rooms").update({ is_active: false }).eq("id", room.id);
        return NextResponse.json(
          { error: "This study session has reached its 45-minute limit." },
          { status: 403 }
        );
      }
    }

    const requiredAccessCode = String(meta.accessCode || "").trim();
    const isPrivate = Boolean(meta.isPrivate || requiredAccessCode);
    const isOwner = user?.id && user.id === room.created_by;

    if (isPrivate && !isOwner && accessCode.toLowerCase() !== requiredAccessCode.toLowerCase()) {
      return NextResponse.json({ error: "Access code is required for this private room." }, { status: 403 });
    }

    const participantGuestName = guestName || "Guest";
    const participant = user?.id
      ? { room_id: room.id, user_id: user.id }
      : { room_id: room.id, guest_name: participantGuestName };

    const existingQuery = supabaseAdmin.from("room_participants").select("id").eq("room_id", room.id).limit(1);
    const { data: existing } = user?.id
      ? await existingQuery.eq("user_id", user.id)
      : await existingQuery.eq("guest_name", participantGuestName);

    // Enforce strict 5-seat limit on study rooms (reject 6th participant)
    if (roomType === "study" && (!existing || existing.length === 0)) {
      const { count } = await supabaseAdmin
        .from("room_participants")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id);

      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: "This study room has reached its maximum capacity of 5 seats." },
          { status: 403 }
        );
      }
    }

    const { error: participantError } = existing?.length
      ? { error: null }
      : await supabaseAdmin.from("room_participants").insert(participant as any);

    if (participantError) {
      return NextResponse.json({ error: participantError.message }, { status: 500 });
    }

    return NextResponse.json({ roomId: room.id, roomType });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}

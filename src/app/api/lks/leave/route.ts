import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-role key so we can bypass RLS when removing a participant
// (sendBeacon requests won't carry the user's auth cookie reliably)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Fall back to anon key if service key not set — works if RLS allows deletes by owner
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { roomId, userId } = body;

        if (!roomId || !userId) {
            return NextResponse.json({ error: "Missing roomId or userId" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("lks_participants")
            .delete()
            .match({ room_id: roomId, user_id: userId });

        if (error) {
            console.error("[leave] delete error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[leave] exception:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

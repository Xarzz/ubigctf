// Server Component — fetches data at request time (no client-side loading delay)
import { createClient } from "@supabase/supabase-js";
import AdminChallengesClient from "./AdminChallengesClient";

// Server-side Supabase client (uses same anon key — no auth needed for these reads)
const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function AdminChallengesPage() {
    // Both queries run in parallel on the server — data is ready before the page is sent to the browser
    const [{ data: challenges }, { data: categories }] = await Promise.all([
        supabaseServer
            .from("challenges")
            .select(`id, title, description, points, difficulty, flag, is_active, target_url, file_url, hints, categories (name)`)
            .order("created_at", { ascending: false }),
        supabaseServer
            .from("categories")
            .select("*")
            .order("name"),
    ]);

    return (
        <AdminChallengesClient
            initialChallenges={challenges || []}
            initialCategories={categories || []}
        />
    );
}

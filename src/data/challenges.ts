export type Category = "Web Exploitation" | "Cryptography" | "Binary" | "Forensics" | "Reverse Engineering";

export interface Challenge {
  id: string;
  title: string;
  category: Category;
  description: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard";
  flag: string; // the actual mock flag
  solved?: boolean;
}

export const mockChallenges: Challenge[] = [
  {
    id: "web1",
    title: "Inspect Element",
    category: "Web Exploitation",
    description: "I left a secret hidden on the main page. Can you look closely enough to find it?",
    points: 100,
    difficulty: "Easy",
    flag: "UbigCTF{1nsp3ct_th3_w3b_123}",
  },
  {
    id: "web2",
    title: "Cookie Monster",
    category: "Web Exploitation",
    description: "We set a very special cookie for the admin. Maybe you can forge it?",
    points: 200,
    difficulty: "Medium",
    flag: "UbigCTF{c00ki3_n0m_n0m}",
  },
  {
    id: "crypto1",
    title: "Caesar Salad",
    category: "Cryptography",
    description: "Julius loved this cipher. Gur synt vf: HovtPGS{pnrfnexrld_orff}",
    points: 100,
    difficulty: "Easy",
    flag: "UbigCTF{caesar_key_bess}",
  },
  {
    id: "crypto2",
    title: "Base64 Basic",
    category: "Cryptography",
    description: "Decode this string to find the flag: VWJpZ0NURntYMTRfdjBZNklfbWhzfQ==",
    points: 150,
    difficulty: "Easy",
    flag: "UbigCTF{X14_v0Y6I_mhs}",
  },
  {
    id: "bin1",
    title: "Buffer Overflow 0",
    category: "Binary",
    description: "Can you smash the stack to rewrite the return address?",
    points: 300,
    difficulty: "Hard",
    flag: "UbigCTF{sm4sh_th3_st4ck_777}",
  },
  {
    id: "for1",
    title: "Magic Bytes",
    category: "Forensics",
    description: "This file claims to be a PNG, but the hex says otherwise.",
    points: 150,
    difficulty: "Medium",
    flag: "UbigCTF{m4g1c_byt3s_ar3_k3y}",
  }
];

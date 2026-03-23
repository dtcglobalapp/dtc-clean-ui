import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jsrjejxhggchkvqrbwxh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Kj9JSzHt5enmYQLauuNTKg_SzrtoX0l";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export async function getSessionUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getSessionUser();

  if (!user) {
    window.location.href = "../login.html";
    return null;
  }

  return user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
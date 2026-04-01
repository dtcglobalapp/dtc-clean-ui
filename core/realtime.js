export function subscribeToTable({
  supabase,
  table,
  onChange,
  schema = "public"
}) {
  const channel = supabase
    .channel(`dtc-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema, table },
      (payload) => {
        console.log(`Realtime ${table}:`, payload.eventType);
        onChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
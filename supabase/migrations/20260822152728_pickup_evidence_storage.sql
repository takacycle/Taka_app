-- Storage bucket for agent-captured pickup evidence photos (scale + material).
-- Private bucket: only the assigned agent can upload (immutable — no update/delete
-- policy, matching pickup_evidence's own immutability), and only a server-side
-- connection using the secret key can read, until a real review UI needs access.

insert into storage.buckets (id, name, public)
values ('pickup-evidence', 'pickup-evidence', false)
on conflict (id) do nothing;

-- Objects must be uploaded under a path like `{pickupId}/{filename}` — this
-- policy checks that pickup is actually assigned to the uploading agent.
create policy "pickup_evidence_upload_assigned_agent"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pickup-evidence'
  and exists (
    select 1 from pickups p
    where p.id::text = (storage.foldername(name))[1]
      and p.agent_id = auth.uid()
  )
);

-- Suspension needs to be a real block, not just a status label the UI happens to
-- check. Tighten the two RLS policies that let an agent act on a pickup at all, so
-- a suspended agent's session can't update pickup status or submit evidence even by
-- calling the API directly, bypassing the app UI entirely.
alter policy "pickups_update_assigned_agent" on pickups
  using (
    agent_id = auth.uid()
    and exists (select 1 from agents a where a.id = auth.uid() and a.reputation_status != 'suspended')
  )
  with check (
    agent_id = auth.uid()
    and exists (select 1 from agents a where a.id = auth.uid() and a.reputation_status != 'suspended')
  );

alter policy "pickup_evidence_insert_assigned_agent" on pickup_evidence
  with check (
    exists (
      select 1 from pickups p
      join agents a on a.id = p.agent_id
      where p.id = pickup_evidence.pickup_id
        and p.agent_id = auth.uid()
        and a.reputation_status != 'suspended'
    )
  );

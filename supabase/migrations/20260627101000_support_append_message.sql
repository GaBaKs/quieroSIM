-- Soporte S2: append-only de mensajes a la conversación del ticket (jsonb).
-- author: 'user'|'bot' → dueño del ticket o admin; 'agent'|'system' → solo admin.
-- Evita que el cliente reescriba el historial: solo concatena un mensaje validado.
create or replace function public.support_append_message(
  p_ticket_id uuid,
  p_author text,
  p_body text,
  p_meta jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_msg jsonb;
begin
  if p_author not in ('user','bot','agent','system') then
    return jsonb_build_object('ok', false, 'reason', 'autor inválido');
  end if;
  select user_id into v_owner from support_ticket where id = p_ticket_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'ticket inexistente');
  end if;
  if p_author in ('user','bot') then
    if v_owner is distinct from v_uid and not is_admin() then
      return jsonb_build_object('ok', false, 'reason', 'no autorizado');
    end if;
  else
    if not is_admin() then
      return jsonb_build_object('ok', false, 'reason', 'solo agentes');
    end if;
  end if;
  v_msg := jsonb_build_object(
    'id', gen_random_uuid(),
    'author', p_author,
    'body', left(coalesce(p_body, ''), 4000),
    'meta', coalesce(p_meta, '{}'::jsonb),
    'at', now()
  );
  update support_ticket
     set bot_conversation_history = coalesce(bot_conversation_history, '[]'::jsonb) || v_msg
   where id = p_ticket_id;
  return jsonb_build_object('ok', true, 'message', v_msg);
end; $$;
revoke all on function public.support_append_message(uuid, text, text, jsonb) from public;
grant execute on function public.support_append_message(uuid, text, text, jsonb) to authenticated;

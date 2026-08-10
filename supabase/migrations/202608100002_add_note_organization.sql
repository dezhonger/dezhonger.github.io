alter table public.notes
  add column if not exists category text not null default '',
  add column if not exists status text not null default 'inbox',
  add column if not exists is_pinned boolean not null default false;

alter table public.notes
  drop constraint if exists notes_category_length_check,
  drop constraint if exists notes_status_check;

alter table public.notes
  add constraint notes_category_length_check
    check (char_length(category) <= 50),
  add constraint notes_status_check
    check (status in ('inbox', 'todo', 'doing', 'done', 'archived'));

create index if not exists notes_user_pinned_updated_at_idx
  on public.notes (user_id, is_pinned desc, updated_at desc);

comment on column public.notes.category is 'Optional user-defined category.';
comment on column public.notes.status is 'Workflow status: inbox, todo, doing, done, or archived.';
comment on column public.notes.is_pinned is 'Whether the note is pinned above regular notes.';

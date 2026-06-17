'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { usd, shortDate } from './format';
import { setUserStatus, setUserRoles, type AdminUserDetail } from '@/server/actions/admin-users';

const ASSIGNABLE = ['customer', 'affiliate', 'agency'] as const;

export default function UserDetailView({ user, isSuperAdmin }: { user: AdminUserDetail; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | 'suspend' | 'reactivate'>(null);
  const [roles, setRoles] = useState<string[]>(user.roles.filter((r) => (ASSIGNABLE as readonly string[]).includes(r)));
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesMsg, setRolesMsg] = useState<string | null>(null);

  const toggleRole = (role: string) => {
    setRoles((cur) => (cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role]));
  };

  const saveRoles = async () => {
    setSavingRoles(true);
    setRolesMsg(null);
    const r = await setUserRoles({ userId: user.id, roles });
    setSavingRoles(false);
    setRolesMsg(r.ok ? 'Roles actualizados ✓' : r.error.message);
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500 hover:text-[#9933c1]">
        <ArrowLeft className="h-4 w-4" /> Volver a usuarios
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{user.email}</h1>
          <StatusBadge kind="user" value={user.accountStatus} />
          {user.isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#9933c1]/10 text-[#9933c1] dark:text-[#b3ff6b] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
              <ShieldAlert className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
        {!user.isAdmin && (
          user.accountStatus === 'suspended' ? (
            <button onClick={() => setDialog('reactivate')} className="flex items-center gap-1.5 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-bold text-white transition cursor-pointer">
              <CheckCircle2 className="h-4 w-4" /> Reactivar
            </button>
          ) : (
            <button onClick={() => setDialog('suspend')} className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-400/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 px-4 py-2 text-sm font-bold transition cursor-pointer">
              <Ban className="h-4 w-4" /> Suspender
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil + roles */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Perfil</h2>
            <dl className="space-y-3 text-sm">
              <Field label="Nombre" value={user.fullName ?? '—'} />
              <Field label="Teléfono" value={user.phone ?? '—'} />
              <Field label="Idioma" value={user.langPref ?? 'ES'} />
              <Field label="Alta" value={shortDate(user.createdAt)} />
            </dl>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Roles</h2>
            {isSuperAdmin && !user.isAdmin ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {ASSIGNABLE.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition cursor-pointer ${
                        roles.includes(role)
                          ? 'bg-[#9933c1] text-white'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <button onClick={saveRoles} disabled={savingRoles} className="mt-4 flex items-center gap-2 rounded-xl bg-[#9933c1] hover:bg-[#7100a5] px-4 py-2 text-sm font-black text-white transition disabled:opacity-60 cursor-pointer">
                  {savingRoles && <Loader2 className="h-4 w-4 animate-spin" />} Guardar roles
                </button>
                {rolesMsg && <p className="mt-3 text-xs font-medium text-zinc-500">{rolesMsg}</p>}
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{user.roles.length ? user.roles.join(', ') : 'Sin roles'}</p>
            )}
          </div>
        </div>

        {/* Órdenes + eSIMs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Órdenes ({user.orders.length})</h2>
            {user.orders.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin órdenes.</p>
            ) : (
              <div className="space-y-2">
                {user.orders.map((o) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-white/5 px-4 py-2.5 hover:border-[#9933c1]/40 transition">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-[#9933c1] dark:text-[#b3ff6b]">#{o.shortId}</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">{o.planName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{usd(o.pricePaid)}</span>
                      <StatusBadge kind="order" value={o.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-white/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">eSIMs ({user.esims.length})</h2>
            {user.esims.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin eSIMs.</p>
            ) : (
              <div className="space-y-2">
                {user.esims.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-white/5 px-4 py-2.5">
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{e.iccid ?? '—'}</span>
                    <StatusBadge kind="esim" value={e.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'suspend'}
        title="Suspender usuario"
        description="El usuario no podrá iniciar sesión hasta que lo reactives. Sus órdenes y eSIMs no se tocan."
        confirmLabel="Suspender"
        tone="danger"
        onConfirm={async () => {
          const r = await setUserStatus({ userId: user.id, status: 'suspended' });
          if (r.ok) router.refresh();
          return { ok: r.ok, error: r.ok ? undefined : r.error.message };
        }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'reactivate'}
        title="Reactivar usuario"
        description="El usuario vuelve a poder iniciar sesión."
        confirmLabel="Reactivar"
        onConfirm={async () => {
          const r = await setUserStatus({ userId: user.id, status: 'active' });
          if (r.ok) router.refresh();
          return { ok: r.ok, error: r.ok ? undefined : r.error.message };
        }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200 break-all">{value}</dd>
    </div>
  );
}

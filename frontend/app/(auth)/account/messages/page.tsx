import { MessagesShell } from "./ui";
import {
  fetchAccountAppointments,
  fetchAccountMessageUnread,
} from "@/lib/api/account-appointments-api";
import { PageHeader } from "@/components/portal-atoms";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ open?: string; channel?: string }>;
};

export default async function AccountMessagesPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [history, unreadById, locale] = await Promise.all([
    fetchAccountAppointments(),
    fetchAccountMessageUnread(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const items = history.ok ? history.data.items : [];
  const openChannel = sp.channel === "doctor" ? "doctor" : "clinic";

  return (
    <div className="gh-patient-page">
      <PageHeader
        eyebrow={a.messages.eyebrow}
        title={a.messages.title}
        description={a.messages.subtitle}
      />
      <MessagesShell
        items={items}
        unreadById={unreadById}
        initialOpenId={sp.open ?? null}
        initialOpenChannel={openChannel}
        unavailableMessage={history.ok ? null : a.messages.unavailable}
        i18n={a.messages}
      />
    </div>
  );
}

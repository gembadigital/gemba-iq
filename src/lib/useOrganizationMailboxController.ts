import { useEffect, useState } from "react";
import type { MailboxSession, ExchangeConfig } from "../types";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import {
  connectOrganizationMailbox,
  disconnectOrganizationMailbox,
  fetchOrganizationMailbox,
  testOrganizationMailbox,
  type OrganizationMailbox,
} from "./organizationMailbox";

export function useOrganizationMailboxController() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [session, setSession] = useState<MailboxSession | null>(null);
  const [organizationMailbox, setOrganizationMailbox] = useState<OrganizationMailbox | null>(null);
  const [config, setConfig] = useState<ExchangeConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (err) {
        console.error("Failed fetching Microsoft Graph configuration:", err);
      }
    };

    fetchConfig();
    if (user) {
      fetchOrganizationMailbox()
        .then(({ mailbox, session: mailboxSession }) => {
          setOrganizationMailbox(mailbox);
          setSession(mailboxSession);
        })
        .catch((err) => {
          console.warn("Failed loading organization mailbox:", err);
          setOrganizationMailbox(null);
          setSession(null);
        });
    } else {
      setOrganizationMailbox(null);
      setSession(null);
    }
  }, [user]);

  const handleConnectOrganizationMailbox = async (mailboxAddress: string) => {
    try {
      const { mailbox, session: mailboxSession } = await connectOrganizationMailbox(mailboxAddress);
      setOrganizationMailbox(mailbox);
      setSession(mailboxSession);
    } catch (err: any) {
      alert(err.message || t("Failed to save organization mailbox connection."));
    }
  };

  const handleDisconnectOrganizationMailbox = async () => {
    try {
      const mailbox = await disconnectOrganizationMailbox();
      setOrganizationMailbox(mailbox);
      setSession(null);
    } catch (err: any) {
      alert(err.message || t("Failed to disconnect organization mailbox."));
    }
  };

  const handleTestOrganizationMailbox = async () => {
    try {
      const result = await testOrganizationMailbox();
      alert(t("Organization mailbox test email sent to {email}.").replace("{email}", result.recipient));
    } catch (err: any) {
      alert(err.message || t("Failed to test organization mailbox."));
    }
  };

  return {
    session,
    organizationMailbox,
    microsoftConfig: config,
    onConnectOrganizationMailbox: handleConnectOrganizationMailbox,
    onDisconnectOrganizationMailbox: handleDisconnectOrganizationMailbox,
    onTestOrganizationMailbox: handleTestOrganizationMailbox,
  };
}
